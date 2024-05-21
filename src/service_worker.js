//chrome.contextMenus.onClicked.addListener(genericOnClick);
import * as tf from '@tensorflow/tfjs';

function preprocessImage(imageData) {
    const pixels = tf.browser.fromPixels(imageData);
    const img = tf.image.resizeBilinear(pixels, [224, 224]);
    const normalizedImg = img.div(255.0);
    const imgArray = normalizedImg.expandDims();
    return imgArray;
}

function clickMenuCallBack(info, tab) {
    const message = { action: 'IMAGE_CLICKED', url: info.linkUrl };
    console.log(info.linkUrl);
    chrome.tabs.sendMessage(tab.id, message, (resp) => {
        if (!resp.rawImageData) {
            console.error(
                'Failed to get image data. ' +
                'The image might be too small or failed to load. ' +
                'See console logs for errors.');
            return;
        }
        console.log(resp);
        const imageData = new ImageData(Uint8ClampedArray.from(resp.rawImageData), resp.width, resp.height);
        const classifierData = preprocessImage(imageData);
        classifier.analyzeImage(classifierData, resp.title, info.linkUrl, tab.id);
    });

}

chrome.runtime.onInstalled.addListener(function () {
    let contexts = [
        'link'
    ];
    for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i];
        let title = "Classify Video";
        chrome.contextMenus.create({
            targetUrlPatterns: ["https://www.youtube.com/watch?v=*", "https://www.youtu.be/watch?v=*"],
            title: title,
            contexts: [context],
            id: context
        });
    }
});

chrome.contextMenus.onClicked.addListener(clickMenuCallBack);

class Classifier {
    constructor() {
        this.loadModel();
    }

    async loadModel() {
        console.log("Loading model...");
        try {
            if (await this.checkModelExists()) {
                this.model = await tf.loadLayersModel("indexeddb://image-model");
            }
            else {
                this.model = await tf.loadLayersModel("https://tkolar20.github.io/model_layers_h5/model.json");
                // for title model
                // this.model = await tf.loadGraphModel("https://raw.githubusercontent.com/tkolar20/tkolar20.github.io/main/title_model_saved_graph/model.json");
                await this.model.save("indexeddb://image-model");
            }
            tf.tidy(() => {
                this.model.predict(tf.zeros([1, 224, 224, 3]));
            });
            console.log("Model loaded.");
        }
        catch (e) {
            console.log("Failed to load model", e);
        }
    }

    async analyzeImage(imageData, title, url, tabId) {
        if (!tabId) {
            console.error('No tab.  No prediction.');
            return;
        }
        const startTime = performance.now();
        const predictions = await this.model.predict(imageData);
        const totalTime = performance.now() - startTime;
        console.log(`Done in ${totalTime.toFixed(1)} ms `);
        const predictedValue = predictions.arraySync()[0][0];
        const message = { action: 'IMAGE_CLICK_PROCESSED', title, url, predictedValue };
        chrome.tabs.sendMessage(tabId, message);
    }

    checkModelExists() {
        return new Promise((resolve) => {
            let request = indexedDB.open("tensorflowjs", 1);
            request.onsuccess = (event) => {
                let db = event.target.result;
                if (db.objectStoreNames.contains("model_info_store")) {
                    let store = db.transaction(["model_info_store"], "readonly").objectStore("model_info_store");
                    let getRequest = store.get("image-model");
                    getRequest.onsuccess = (event) => {
                        if (event.target.result !== undefined) {
                            console.log("Key exists");
                            return resolve(true);
                        }
                        else {
                            console.log("Key doesnt exist");
                            return resolve(false);
                        }
                    }
                    getRequest.onerror = (event) => {
                        return resolve(false);
                    }
                }
            }
            request.onupgradeneeded = (event) => {
                event.target.transaction.abort();
                return resolve(false);
            };
        });
    }
}

const classifier = new Classifier();

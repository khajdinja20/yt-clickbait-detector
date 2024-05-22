//chrome.contextMenus.onClicked.addListener(genericOnClick);
import * as tf from '@tensorflow/tfjs';
import {closest} from 'fastest-levenshtein';
function preprocessImage(imageData)
{
    const pixels = tf.browser.fromPixels(imageData);
    const img = tf.image.resizeBilinear(pixels, [224, 224]);
    const normalizedImg = img.div(255.0);
    const imgArray = normalizedImg.expandDims();
    return imgArray;
}

function clickMenuCallBack(info, tab)
{
    const message = {action: 'IMAGE_CLICKED', url: info.linkUrl};
    console.log(info.linkUrl);
    chrome.tabs.sendMessage(tab.id, message, (resp) =>
    {
        if(!resp.rawImageData)
        {
            console.error(
                'Failed to get image data. ' +
                'The image might be too small or failed to load. ' +
                'See console logs for errors.');
            return;
        }
        console.log(resp);
        const imageData = new ImageData(Uint8ClampedArray.from(resp.rawImageData), resp.width, resp.height);
        const classifierData = preprocessImage(imageData);
        classifier.analyze(classifierData, resp.title, info.linkUrl, tab.id);
    });

}

chrome.runtime.onInstalled.addListener(function()
{
    let contexts = [
        'link'
    ];
    for(let i = 0; i < contexts.length; i++)
    {
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

class Classifier
{
    constructor ()
    {
        this.loadModel();
    }

    async loadModel()
    {
        console.log("Loading image model...");
        try
        {
            if(await this.checkImageModelExists())
            {
                this.model = await tf.loadLayersModel("indexeddb://image-model");
            }
            else
            {
                this.model = await tf.loadLayersModel("https://tkolar20.github.io/model_layers_h5/model.json");
                await this.model.save("indexeddb://image-model");
            }
            tf.tidy(() =>
            {
                this.model.predict(tf.zeros([1, 224, 224, 3]));
            });
            console.log("Image model loaded.");
        }
        catch(e)
        {
            console.log("Failed to load image model", e);
        }

        console.log("Loading title model...");
        try
        {
            if(await this.checkTitleModelExists())
            {
                this.titleModel = await tf.loadGraphModel("indexeddb://title-model");
            }
            else
            {
                //this.titleModel = await tf.loadGraphModel("https://raw.githubusercontent.com/tkolar20/tkolar20.github.io/main/title_model_saved_graph/model.json");
                this.titleModel = await tf.loadGraphModel("https://raw.githubusercontent.com/tkolar20/tkolar20.github.io/main/tiny_title_model_saved_graph/model.json");
                await this.titleModel.save("indexeddb://title-model");
            }
            tf.tidy(() =>
            {
                const prediction = this.titleModel.execute({
                    'input_ids': tf.tensor2d([101, 2017, 2180, 2102, 2903, 2023, 999, 999, 999, 102], [1, 10], 'int32'),
                    "token_type_ids": tf.zeros([1, 10], "int32"), //needed for tinybert
                    "attention_mask": tf.tensor2d([1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 10], 'int32')
                });
            });
            console.log("Title model loaded.");
        }
        catch(e)
        {
            console.log("Failed to load title model", e);
        }
    }

    async analyze(imageData, title, url, tabId)
    {
        console.time("analysis");
        if(!tabId)
        {
            console.error('No tab.  No prediction.');
            return;
        }
        console.time("tokenize");
        const tokenized = await tokenizer.tokenize(title);
        console.log(tokenized);
        console.timeEnd("tokenize");
        const predictionsImage = await this.model.predict(imageData);

        const predictionsTitle = await this.titleModel.predict({
            'input_ids': tf.tensor2d(tokenized, [1, tokenized.length], "int32"),
            'token_type_ids': tf.zeros([1, tokenized.length], "int32"), //needed for tinybert
            'attention_mask': tf.ones([1, tokenized.length], "int32")
        });
        const predictedValuesTitle = predictionsTitle.arraySync();
        const clickbaitValueTitle = tf.softmax(predictedValuesTitle).arraySync()[0][1];
        const clickbaitValueImage = predictionsImage.arraySync()[0][0];
        const predictedValue = (clickbaitValueTitle + clickbaitValueImage) / 2;
        console.timeEnd("analysis");
        const message = {action: 'IMAGE_CLICK_PROCESSED', title, url, predictedValue};
        chrome.tabs.sendMessage(tabId, message);
    }

    checkImageModelExists()
    {
        return new Promise((resolve) =>
        {
            let request = indexedDB.open("tensorflowjs", 1);
            request.onsuccess = (event) =>
            {
                let db = event.target.result;
                if(db.objectStoreNames.contains("model_info_store"))
                {
                    let store = db.transaction(["model_info_store"], "readonly").objectStore("model_info_store");
                    let getRequest = store.get("image-model");
                    getRequest.onsuccess = (event) =>
                    {
                        if(event.target.result !== undefined)
                        {
                            console.log("Key exists");
                            return resolve(true);
                        }
                        else
                        {
                            console.log("Key doesnt exist");
                            return resolve(false);
                        }
                    }
                    getRequest.onerror = (event) =>
                    {
                        return resolve(false);
                    }
                }
            }
            request.onupgradeneeded = (event) =>
            {
                event.target.transaction.abort();
                return resolve(false);
            };
        });
    }

    checkTitleModelExists()
    {
        return new Promise((resolve) =>
        {
            let request = indexedDB.open("tensorflowjs", 1);
            request.onsuccess = (event) =>
            {
                let db = event.target.result;
                if(db.objectStoreNames.contains("model_info_store"))
                {
                    let store = db.transaction(["model_info_store"], "readonly").objectStore("model_info_store");
                    let getRequest = store.get("title-model");
                    getRequest.onsuccess = (event) =>
                    {
                        if(event.target.result !== undefined)
                        {
                            console.log("Key exists");
                            return resolve(true);
                        }
                        else
                        {
                            console.log("Key doesnt exist");
                            return resolve(false);
                        }
                    }
                    getRequest.onerror = (event) =>
                    {
                        return resolve(false);
                    }
                }
            }
            request.onupgradeneeded = (event) =>
            {
                event.target.transaction.abort();
                return resolve(false);
            };
        });
    }
}

class Tokenizer
{
    constructor ()
    {
        this.loadTokenizer();
    }

    async loadTokenizer()
    {
        const vocab = await (await fetch("https://tkolar20.github.io/title_model_saved_graph/vocab.txt")).text();
        this.vocabArray = vocab.split("\n");
        // maybe fetch special_tokens_map and tokenizer_config
    }

    async tokenize(title)
    {
        const input = title.toLowerCase();
        const titleArray = input.split(/(?=[!"#$%&'()*+,-./:;<=>?@[\]\\^_`{|}~¡¢£¤¥¦§¨©ª«¬®°±÷¿ʻʼʾʿˈː])|(?<=[!"#$%&'()*+,-./:;<=>?@[\]\\^_`{|}~¡¢£¤¥¦§¨©ª«¬®°±÷¿ʻʼʾʿˈː])|\s+/);
        const tokens = titleArray.map((x) =>
        {
            const index = this.vocabArray.findIndex((el) => el == x);
            if(index != -1)
            {
                return index;
            }
            const closestWord = closest(x, this.vocabArray);
            return this.vocabArray.findIndex((el) => el == closestWord);
        });
        tokens.unshift(101);
        tokens.push(102);
        return tokens;
    }
}

const tokenizer = new Tokenizer();
const classifier = new Classifier();

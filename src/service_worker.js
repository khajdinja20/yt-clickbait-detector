chrome.contextMenus.onClicked.addListener(genericOnClick);

// A generic onclick callback function.
function genericOnClick(info) {
    console.log('Standard context menu item clicked.');
}

chrome.runtime.onInstalled.addListener(function () {
    // Create one test item for each context type.
    let contexts = [
        'link'
    ];
    for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i];
        let title = "Classify video";
        chrome.contextMenus.create({
            title: title,
            contexts: [context],
            id: context
        });
    }
});
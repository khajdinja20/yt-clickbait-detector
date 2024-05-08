//chrome.contextMenus.onClicked.addListener(genericOnClick);
function genericOnClick(info) {
    console.log('Standard context menu item clicked.');
}

function clickMenuCallBack(info, tab) {
    const message = { action: 'IMAGE_CLICKED', url: info.linkUrl };
    console.log(info.linkUrl);
    chrome.tabs.sendMessage(tab.id, message);/*
    if (!resp.rawImageData) {
        console.error(
            'Failed to get image data. ' +
            'The image might be too small or failed to load. ' +
            'See console logs for errors.');
        return;
    }
    console.log(resp);*/

}

// find a way to get the image url or image itself from the link context or just restrict it to the image context lmao
// or somehow get the DOM element that was clicked on which would probably be the easiest even though service workers dont have access to the DOM
// you could use the offscreen document API to use the DOM 


chrome.runtime.onInstalled.addListener(function () {
    let contexts = [
        'link'
    ];
    for (let i = 0; i < contexts.length; i++) {
        let context = contexts[i];
        let title = "Classify Video";
        chrome.contextMenus.create({
            title: title,
            contexts: [context],
            id: context
        });
    }
});

chrome.contextMenus.onClicked.addListener(clickMenuCallBack);
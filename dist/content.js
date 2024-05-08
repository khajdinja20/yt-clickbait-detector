chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) {
        return;
    }
    switch (message.action) {
        case "IMAGE_CLICKED":
            {
                //loadImageAndSendDataBack(message.url, sendResponse);
                findElement(message.url);
            }
    }
    return true;
});


function findElement(url) {
    let lastIndex = url.lastIndexOf("/");
    console.log(lastIndex);
    let tempUrl = url.slice(lastIndex);
    console.log(tempUrl);
    const wantedAnchors = document.querySelectorAll("a[href*='" + tempUrl + "']");
    const imgAnchor = wantedAnchors[0];
    const titleAnchor = wantedAnchors[1];
    console.log(imgAnchor.getElementsByTagName("yt-image")[0].getElementsByTagName("img")[0].getAttribute("src"));
    console.log(titleAnchor.getAttribute("title"));
}
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
    const lastIndex = url.lastIndexOf("/");
    const watchURL = url.slice(lastIndex);
    const wantedAnchors = document.querySelectorAll("a[href*='" + watchURL + "']");
    let titleAnchor = wantedAnchors[1];
    if(titleAnchor.id == "thumbnail")
    {  
        titleAnchor = wantedAnchors[2];
    }
    const thumbnailURL = constructThumbnailURL(watchURL);
    const title = titleAnchor.getAttribute("title");
    console.log(thumbnailURL);
    console.log(title);
    
}

function constructThumbnailURL(url)
{
    const firstSliceIndex = url.lastIndexOf("v=");
    const tempURL = url.slice(firstSliceIndex + 2);
    const annoyingPP = tempURL.lastIndexOf("&pp");
    let videoID;
    if(annoyingPP == -1)
    {
        videoID = tempURL;
    }
    else
    {
        videoID = tempURL.slice(0, annoyingPP);
    }
    return "https://img.youtube.com/vi/" + videoID +"/mqdefault.jpg";
}
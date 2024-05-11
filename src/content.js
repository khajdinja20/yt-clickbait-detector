const TEXT_DIV_CLASSNAME = 'extension_text';
const HIGH_CONFIDENCE_THRESHOLD = 0.6;
const LOW_CONFIDENCE_THRESHOLD = 0.1;
const IMG_SIZE = 224;
const MIN_IMG_SIZE = 120;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
{
    if(!message)
    {
        return;
    }
    switch(message.action)
    {
        case "IMAGE_CLICKED":
            {
                loadImageAndSendDataBack(findElement(message.url), sendResponse);
                return true;
    }
    return true;
});

function getWatchURL(url)
{
    return url.slice(url.lastIndexOf("/"));
}

function getTitleAnchor(watchURL)
{
    const wantedAnchors = document.querySelectorAll("a[href*='" + watchURL + "']");
    let titleAnchor = wantedAnchors[1];
    if(titleAnchor.id == "thumbnail")
    {
        titleAnchor = wantedAnchors[2];
    }
    return titleAnchor;
}

function findElement(url)
{
    const watchURL = getWatchURL(url);
    const thumbnailURL = constructThumbnailURL(watchURL);
    const title = getTitleAnchor(watchURL).getAttribute("title");
    console.log(thumbnailURL);
    console.log(title);
    return new Array(thumbnailURL, title);
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
    return "https://img.youtube.com/vi/" + videoID + "/mqdefault.jpg";
}

function loadImageAndSendDataBack(elements, sendResponse)
{
    const img = new Image();
    const src = elements[0];
    img.crossOrigin = "anonymous";
    img.onerror = function(e)
    {
        console.warn(`Could not load image from external source ${src}.`);
        sendResponse({rawImageData: undefined});
        return;
    };
    img.onload = function(e)
    {
        if((img.height && img.height > MIN_IMG_SIZE) ||
            (img.width && img.width > MIN_IMG_SIZE))
        {
            img.width = IMG_SIZE;
            img.height = IMG_SIZE;
            const canvas = new OffscreenCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            sendResponse({
                rawImageData: Array.from(imageData.data),
                width: img.width,
                height: img.height,
                title: elements[1]
            });
            return;
        }
        console.warn(`Image size too small. [${img.height} x ${img.width}] vs. minimum [${MIN_IMG_SIZE} x ${MIN_IMG_SIZE}]`);
        sendResponse({rawImageData: undefined});
    };
    img.src = src;
}
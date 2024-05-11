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
                //findElement(message.url);
                loadImageAndSendDataBack(findElement(message.url)[0], sendResponse);
            }
    }
    return true;
});


function findElement(url)
{
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

function loadImageAndSendDataBack(src, sendResponse)
{
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = function(e)
    {
        console.warn(`Could not load image from external source ${src}.`);
        sendResponse({rawImageData: undefined});
        return;
    };
    img.onload = function(e)
    {
        if((img.height && img.height > 120) ||
            (img.width && img.width > 120))
        {
            img.width = 224;
            img.height = 224;
            const canvas = new OffscreenCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            sendResponse({
                rawImageData: Array.from(imageData.data),
                width: img.width,
                height: img.height,
            });
            return;
        }
        console.warn(`Image size too small. [${img.height} x ${img.width}] vs. minimum [${MIN_IMG_SIZE} x ${MIN_IMG_SIZE}]`);
        sendResponse({rawImageData: undefined});
    };
    img.src = src;
}
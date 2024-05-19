document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('threshold');
    const valueDisplay = document.getElementById('value');

    // Load the stored threshold value
    chrome.storage.sync.get(['clickbaitThreshold'], function (result) {
        if (result.clickbaitThreshold !== undefined) {
            slider.value = result.clickbaitThreshold;
            valueDisplay.textContent = `${result.clickbaitThreshold}%`;
        }
    });

    // Update the displayed value and store it when the slider changes
    slider.addEventListener('input', function () {
        const value = slider.value;
        valueDisplay.textContent = `${value}%`;
        chrome.storage.sync.set({ clickbaitThreshold: value });
    });
});

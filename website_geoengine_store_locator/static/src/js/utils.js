odoo.define('openstreetmap.utils', function (require) {
    'use strict';
    
    /**
    * Bootstraps an "empty" Google Maps iframe.
    *
    * @returns {HTMLIframeElement}
    */
    function generateOSMapIframe() {
        const iframeEl = document.createElement('iframe');
        iframeEl.classList.add('s_openstreetmap_embedded', 'o_not_editable');
        iframeEl.setAttribute('width', '100%');
        iframeEl.setAttribute('height', '100%');
        iframeEl.setAttribute('frameborder', '0');
        iframeEl.setAttribute('scrolling', 'no');
        iframeEl.setAttribute('marginheight', '0');
        iframeEl.setAttribute('marginwidth', '0');
        iframeEl.setAttribute('src', 'about:blank');
        return iframeEl;
    }

    /**
     * Generates a Google Maps URL based on the given parameter.
     *
     * @param {DOMStringMap} dataset
     * @returns {string} a Google Maps URL
     */
    function generateOSMapLink(dataset) {
        return 'https://www.openstreetmap.org/export/embed.html' 
            + '?bbox=1.0491943359375002%2c49.360911547126165%2c7.215270996093751%2c51.631657349449995'
            + '&amp;layer=' +encodeURIComponent(dataset.mapType)
            //+ '#map=' + encodeURIComponent(dataset.mapZoom)
            //+ '/46.6474/6.9567' ;
            
    }

    return {
        generateOSMapLink:generateOSMapLink,
        generateOSMapIframe: generateOSMapIframe,
    };
});








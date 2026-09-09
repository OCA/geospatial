// Copyright 2026 Cetmix OÜ
// License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

/* global document, mapboxgl, window */

import {
    Component,
    onMounted,
    onPatched,
    onWillStart,
    onWillUnmount,
    useRef,
    useState,
} from "@odoo/owl";
import {AssetsLoadingError, loadCSS, loadJS} from "@web/core/assets";
import {browser} from "@web/core/browser/browser";
import {_t} from "@web/core/l10n/translation";
import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";
import {useRecordObserver} from "@web/model/relational_model/utils";
import {session} from "@web/session";
import {standardFieldProps} from "@web/views/fields/standard_field_props";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";

const MAPBOX_GL_VERSION = "3.30.0";
const MAPBOX_GL_JS = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`;
const MAPBOX_GL_CSS = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;
const DEFAULT_ZOOM = 12;
const DEFAULT_MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const DEFAULT_SATELLITE_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const MIN_PITCH = 0;
const MAX_PITCH = 85;
const HEX_COLOR_RE = /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
export const MAPBOX_STYLE_STORAGE_KEY = "web_widget_mapbox.style";
const mapboxFields = new Set();

/**
 * Normalize a Map / Satellite kind from storage or a button click.
 *
 * @param {unknown} kind
 * @returns {String} `"satellite"` or `"map"`
 */
function styleKind(kind) {
    return kind === "satellite" ? "satellite" : "map";
}

/**
 * Last Map / Satellite choice stored for this browser origin.
 *
 * @returns {String}
 */
function storedStyleKind() {
    return styleKind(browser.localStorage.getItem(MAPBOX_STYLE_STORAGE_KEY));
}

/**
 * @param {unknown} value
 * @returns {Boolean}
 */
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {unknown} lat
 * @param {unknown} lon
 * @returns {Boolean}
 */
function isValidLatLon(lat, lon) {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
    );
}

/**
 * @param {unknown} value
 * @returns {Object|null}
 */
function getPayload(value) {
    return isPlainObject(value) ? value : null;
}

/**
 * @param {Object} payload
 * @returns {{map: String, satellite: String}}
 */
function getStyles(payload) {
    const style = isPlainObject(payload.style) ? payload.style : {};
    return {
        map: style.map || DEFAULT_MAP_STYLE,
        satellite: style.satellite || DEFAULT_SATELLITE_STYLE,
    };
}

/**
 * @param {Object} payload
 * @returns {{center: Number[], zoom: Number, pitch: Number}}
 */
function getCamera(payload) {
    const zoom = Number.isFinite(payload.default_zoom)
        ? payload.default_zoom
        : DEFAULT_ZOOM;
    const rawPitch = Number.isFinite(payload.default_pitch) ? payload.default_pitch : 0;
    const pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, rawPitch));
    const defaultCenter = payload.default_center;
    if (
        isPlainObject(defaultCenter) &&
        isValidLatLon(defaultCenter.lat, defaultCenter.lon)
    ) {
        return {center: [defaultCenter.lon, defaultCenter.lat], zoom, pitch};
    }
    const elements = Array.isArray(payload.elements) ? payload.elements : [];
    const first = elements.find(
        (element) => element && isValidLatLon(element.lat, element.lon)
    );
    if (first) {
        return {center: [first.lon, first.lat], zoom, pitch};
    }
    return {center: [0, 0], zoom, pitch};
}

/**
 * @param {Object} payload
 * @returns {Object}
 */
function getHandlerOptions(payload) {
    const allowZoom = payload.allow_zoom !== false;
    const allowPan = payload.allow_pan !== false;
    const allowPitch = payload.allow_pitch !== false;
    return {
        allowZoom,
        constructor: {
            scrollZoom: allowZoom,
            boxZoom: allowZoom,
            doubleClickZoom: allowZoom,
            touchZoomRotate: allowZoom,
            dragPan: allowPan,
            touchPitch: allowPitch,
            pitchWithRotate: allowPitch,
            dragRotate: allowPitch,
        },
        postInit: (map) => {
            map.keyboard.disableBearing();
            if (allowPitch) {
                map.dragRotate.disableRotation();
            } else {
                map.keyboard.disablePitch();
            }
            if (allowZoom) {
                map.touchZoomRotate.disableRotation();
            } else {
                map.keyboard.disableZoom();
            }
            if (!allowPan) {
                map.keyboard.disablePan();
            }
        },
    };
}

/**
 * @param {Object} element
 * @returns {Boolean}
 */
function canOpenRecord(element) {
    return (
        element.clickable === true &&
        typeof element.rec_model === "string" &&
        Boolean(element.rec_model) &&
        Number.isInteger(element.rec_id) &&
        element.rec_id > 0
    );
}

/**
 * @param {Object} element
 * @returns {String|null}
 */
function markerColor(element) {
    const value = element.color;
    return typeof value === "string" && HEX_COLOR_RE.test(value) ? value : null;
}

/**
 * @param {Object} element
 * @returns {HTMLElement}
 */
function buildIconElement(element) {
    const wrapper = document.createElement("div");
    wrapper.className = "o_mapbox_marker_icon";
    const icon = document.createElement("i");
    const raw = String(element.icon);
    const name = raw.startsWith("fa-") ? raw.slice(3) : raw;
    icon.className = `fa fa-${name}`;
    wrapper.appendChild(icon);
    const color = markerColor(element);
    if (color) {
        wrapper.style.color = color;
    }
    if (Number.isInteger(element.size) && element.size > 0) {
        wrapper.style.fontSize = `${element.size}px`;
        wrapper.style.width = `${element.size}px`;
        wrapper.style.height = `${element.size}px`;
    }
    return wrapper;
}

/**
 * @param {Object} payload
 * @param {Boolean} readonly
 * @returns {String}
 */
function markersKey(payload, readonly) {
    return JSON.stringify([Boolean(readonly), payload.elements || []]);
}

/**
 * @param {Object} payload
 * @returns {String}
 */
function mapConfigKey(payload) {
    // Omit elements: marker-only updates must not reset the camera.
    // Center is the explicit default_center only; getCamera's first-pin / [0,0]
    // fallbacks must not enter the key (D15).
    const styles = getStyles(payload);
    const camera = getCamera(payload);
    const defaultCenter = payload.default_center;
    const center =
        isPlainObject(defaultCenter) &&
        isValidLatLon(defaultCenter.lat, defaultCenter.lon)
            ? camera.center
            : null;
    return JSON.stringify([
        center,
        camera.zoom,
        camera.pitch,
        styles.map,
        styles.satellite,
        payload.allow_zoom !== false,
        payload.allow_pan !== false,
        payload.allow_pitch !== false,
        payload.allow_fullscreen !== false,
    ]);
}

class StyleSwitchControl {
    /**
     * @param {{onSelect: Function}} params
     */
    constructor(params) {
        this._onSelect = params.onSelect;
        this._container = null;
    }

    /**
     * @returns {HTMLElement}
     */
    onAdd() {
        this._container = document.createElement("div");
        this._container.className =
            "mapboxgl-ctrl mapboxgl-ctrl-group o_mapbox_style_switch";
        this._container.appendChild(this._button("map", _t("Map")));
        this._container.appendChild(this._button("satellite", _t("Satellite")));
        return this._container;
    }

    onRemove() {
        if (this._container) {
            this._container.remove();
            this._container = null;
        }
    }

    /**
     * @param {String} kind
     * @param {String} label
     * @returns {HTMLButtonElement}
     */
    _button(kind, label) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `o_mapbox_style_${kind}`;
        button.textContent = label;
        button.addEventListener("click", () => this._onSelect(kind));
        return button;
    }
}

export class MapboxField extends Component {
    static template = "web_widget_mapbox.MapboxField";
    static props = {...standardFieldProps};

    setup() {
        this.mapRef = useRef("map");
        this.dialog = useService("dialog");
        this.map = null;
        this._markers = [];
        this._lastElementsKey = null;
        this._lastConfigKey = null;
        this._datapointId = null;
        this._styles = null;
        this.cdnFailed = false;
        this.state = useState({
            placeholder: session.mapbox_token ? false : "token",
        });
        onWillStart(() => this._loadCdn());
        useRecordObserver((record) => this._onRecordChange(record));
        onMounted(() => this._ensureMap());
        onPatched(() => {
            this._ensureMap();
            if (this.map) {
                this.map.resize();
                const payload = getPayload(this.props.record.data[this.props.name]);
                if (payload) {
                    this._syncMap(payload);
                }
            }
        });
        onWillUnmount(() => {
            this._unmounted = true;
            this._destroyMap();
        });
    }

    /**
     * @returns {String}
     */
    get placeholderMessage() {
        if (this.state.placeholder === "token") {
            return _t(
                "Set a Mapbox Token under Settings → General Settings → Integrations → Mapbox Token to display this map."
            );
        }
        if (this.state.placeholder === "cdn") {
            return _t(
                "The Mapbox library could not be loaded. Check that this browser can reach api.mapbox.com."
            );
        }
        return _t("No map data to display.");
    }

    /**
     * Handle a Mapbox CDN load failure. Non-asset errors are rethrown.
     *
     * @param {Error} error
     */
    _onAssetsError(error) {
        if (!(error instanceof AssetsLoadingError)) {
            throw error;
        }
        if (this._unmounted) {
            return;
        }
        this.cdnFailed = true;
        this.state.placeholder = "cdn";
        this._destroyMap();
    }

    async _loadCdn() {
        if (!session.mapbox_token) {
            this.state.placeholder = "token";
            return;
        }
        // LoadCSS retries (~22.5s) must not block onWillStart.
        loadCSS(MAPBOX_GL_CSS).catch((error) => this._onAssetsError(error));
        try {
            await loadJS(MAPBOX_GL_JS);
        } catch (error) {
            this._onAssetsError(error);
        }
    }

    /**
     * @param {Object} record
     */
    _onRecordChange(record) {
        const payload = getPayload(record.data[this.props.name]);
        const kind = this._placeholderKind(payload);
        this.state.placeholder = kind;
        const recordChanged = this._datapointId !== record.id;
        this._datapointId = record.id;
        if (kind) {
            this._destroyMap();
            return;
        }
        if (recordChanged) {
            this._destroyMap();
            return;
        }
        if (!this.map) {
            return;
        }
        this._syncMap(payload);
    }

    /**
     * @param {Object} payload
     */
    _syncMap(payload) {
        const key = mapConfigKey(payload);
        if (this.map && key !== this._lastConfigKey) {
            this._destroyMap();
            this._ensureMap();
            return;
        }
        this._syncMarkers(payload);
    }

    /**
     * @param {Object} payload
     */
    _syncMarkers(payload) {
        const key = markersKey(payload, this.props.readonly);
        if (key !== this._lastElementsKey) {
            this._lastElementsKey = key;
            this._renderMarkers(payload);
        }
    }

    /**
     * @param {Object|null} payload
     * @returns {String|Boolean}
     */
    _placeholderKind(payload) {
        if (!session.mapbox_token) {
            return "token";
        }
        if (this.cdnFailed) {
            return "cdn";
        }
        if (!payload) {
            return "empty";
        }
        return false;
    }

    _ensureMap() {
        if (this.state.placeholder || this.map || !this.mapRef.el) {
            return;
        }
        this._createMap();
    }

    _createMap() {
        const payload = getPayload(this.props.record.data[this.props.name]);
        if (!payload || !session.mapbox_token || typeof mapboxgl === "undefined") {
            return;
        }
        mapboxgl.accessToken = session.mapbox_token;
        const camera = getCamera(payload);
        const handlers = getHandlerOptions(payload);
        this._styles = getStyles(payload);
        this._styleKind = storedStyleKind();
        this.map = new mapboxgl.Map({
            container: this.mapRef.el,
            style:
                this._styleKind === "satellite"
                    ? this._styles.satellite
                    : this._styles.map,
            center: camera.center,
            zoom: camera.zoom,
            pitch: camera.pitch,
            bearing: 0,
            attributionControl: true,
            ...handlers.constructor,
        });
        handlers.postInit(this.map);
        if (handlers.allowZoom) {
            this.map.addControl(new mapboxgl.NavigationControl({showCompass: false}));
        }
        if (payload.allow_fullscreen !== false) {
            this.map.addControl(new mapboxgl.FullscreenControl());
        }
        this.map.addControl(
            new StyleSwitchControl({
                onSelect: (kind) => this._setStyle(kind),
            })
        );
        this.map.on("load", () => {
            if (this.map) {
                this.map.resize();
            }
        });
        window.requestAnimationFrame(() => {
            if (this.map) {
                this.map.resize();
            }
        });
        this._lastConfigKey = mapConfigKey(payload);
        this._lastElementsKey = markersKey(payload, this.props.readonly);
        this._renderMarkers(payload);
        mapboxFields.add(this);
    }

    /**
     * @param {String} kind
     */
    _setStyle(kind) {
        const value = styleKind(kind);
        browser.localStorage.setItem(MAPBOX_STYLE_STORAGE_KEY, value);
        mapboxFields.forEach((field) => field._applyStyle(value));
    }

    /**
     * @param {String} kind
     */
    _applyStyle(kind) {
        if (!this.map || !this._styles || this._styleKind === kind) {
            return;
        }
        this._styleKind = kind;
        const style = kind === "satellite" ? this._styles.satellite : this._styles.map;
        const pitch = this.map.getPitch();
        this.map.setStyle(style);
        this.map.once("style.load", () => {
            if (this.map) {
                this.map.setPitch(pitch);
            }
        });
    }

    /**
     * @param {Object} payload
     */
    _renderMarkers(payload) {
        this._clearMarkers();
        const elements = Array.isArray(payload.elements) ? payload.elements : [];
        elements.forEach((element, index) => {
            this._addMarker(element, index);
        });
        const top = this._markers.length;
        this._markers.forEach((marker, order) => {
            marker.getElement().style.zIndex = String(top - order);
        });
    }

    /**
     * @param {Object} element
     * @param {Number} index
     */
    _addMarker(element, index) {
        if (!element || !isValidLatLon(element.lat, element.lon) || !this.map) {
            return;
        }
        const options = {
            draggable: !this.props.readonly && element.editable === true,
        };
        const color = markerColor(element);
        if (color && !element.icon) {
            options.color = color;
        }
        if (element.icon) {
            options.element = buildIconElement(element);
        }
        const marker = new mapboxgl.Marker(options)
            .setLngLat([element.lon, element.lat])
            .addTo(this.map);
        let dragged = false;
        if (options.draggable) {
            marker.on("dragend", () => {
                dragged = true;
                this._onDragEnd(index, marker);
            });
        }
        if (canOpenRecord(element)) {
            marker.getElement().addEventListener("click", () => {
                if (dragged) {
                    dragged = false;
                    return;
                }
                this._openRecord(element);
            });
        } else if (element.label) {
            marker.setPopup(new mapboxgl.Popup().setText(String(element.label)));
        }
        this._markers.push(marker);
    }

    /**
     * @returns {Boolean}
     */
    _isMapFullscreen() {
        const container = this.map && this.map.getContainer();
        if (!container) {
            return false;
        }
        const fullscreenElement =
            document.fullscreenElement || document.webkitFullscreenElement;
        return fullscreenElement === container;
    }

    /**
     * Match the WebGL canvas to the in-page container.
     *
     * Map.resize() no-ops when getBoundingClientRect still equals the
     * fullscreen transform (map.ts), which happens if trackResize runs on
     * fullscreenchange before layout is restored.
     *
     * @returns {void}
     */
    _resizeMap() {
        if (this.map && !this._unmounted) {
            this.map.resize();
        }
    }

    /**
     * Leave map fullscreen and resize the canvas to the in-page field.
     *
     * @returns {Promise<void>|null}
     */
    _exitMapFullscreen() {
        if (!this._isMapFullscreen()) {
            return null;
        }
        const afterExit = () => {
            this._resizeMap();
            window.requestAnimationFrame(() => this._resizeMap());
        };
        if (document.exitFullscreen) {
            return Promise.resolve(document.exitFullscreen()).then(
                afterExit,
                afterExit
            );
        }
        if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
        afterExit();
        return Promise.resolve();
    }

    /**
     * @param {Object} element
     */
    _openRecord(element) {
        const open = () => {
            if (this._unmounted) {
                return;
            }
            this.dialog.add(FormViewDialog, {
                resModel: element.rec_model,
                resId: element.rec_id,
            });
        };
        const exiting = this._exitMapFullscreen();
        if (exiting) {
            Promise.resolve(exiting).then(open, open);
            return;
        }
        open();
    }

    /**
     * @param {Number} index
     * @param {Object} marker
     */
    _onDragEnd(index, marker) {
        const payload = getPayload(this.props.record.data[this.props.name]);
        if (!payload) {
            return;
        }
        const elements = Array.isArray(payload.elements) ? payload.elements : [];
        const source = elements[index];
        if (!source) {
            return;
        }
        const lngLat = marker.getLngLat();
        const nextItem = Object.assign({}, source, {
            lat: lngLat.lat,
            lon: lngLat.lng,
            index,
        });
        const previous = Array.isArray(payload.updated) ? payload.updated.slice() : [];
        const existingPos = previous.findIndex((item) => item.index === index);
        if (existingPos >= 0) {
            previous[existingPos] = nextItem;
        } else {
            previous.push(nextItem);
        }
        this.props.record.update({
            [this.props.name]: Object.assign({}, payload, {updated: previous}),
        });
    }

    _clearMarkers() {
        this._markers.forEach((marker) => marker.remove());
        this._markers = [];
    }

    _destroyMap() {
        mapboxFields.delete(this);
        this._clearMarkers();
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this._lastElementsKey = null;
        this._lastConfigKey = null;
    }
}

export const mapboxField = {
    component: MapboxField,
    displayName: _t("Mapbox Map"),
    supportedTypes: ["json"],
};

registry.category("fields").add("mapbox", mapboxField);

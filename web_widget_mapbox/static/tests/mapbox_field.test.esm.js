// Copyright 2026 Cetmix OÜ
// License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

/* global document, window */

import {after, beforeEach, describe, expect, test} from "@odoo/hoot";
import {
    contains,
    defineModels,
    fields,
    findComponent,
    mockService,
    models,
    mountView,
    patchWithCleanup,
} from "@web/../tests/web_test_helpers";
import {AssetsLoadingError, assets} from "@web/core/assets";
import {browser} from "@web/core/browser/browser";
import {animationFrame} from "@odoo/hoot-mock";
import {session} from "@web/session";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {
    MAPBOX_STYLE_STORAGE_KEY,
    MapboxField,
} from "@web_widget_mapbox/mapbox_field.esm";

describe.current.tags("desktop");

class Partner extends models.Model {
    map_data = fields.Json();
    bar = fields.Boolean();

    _records = [{id: 1, map_data: false, bar: false}];
}

defineModels([Partner]);

/**
 * @param {Object} [overrides]
 * @returns {Object}
 */
function makePayload(overrides = {}) {
    return {
        elements: [
            {lat: 52.37, lon: 4.89, label: "HQ"},
            {
                lat: 52.38,
                lon: 4.9,
                label: "Depot",
                editable: true,
                clickable: true,
                rec_model: "res.partner",
                rec_id: 12,
            },
        ],
        ...overrides,
    };
}

/**
 * @param {Object} [params]
 * @returns {{maps: Object[], markers: Object[], FullscreenControl: Function, NavigationControl: Function}}
 */
function installMapboxMocks({token = "pk.test"} = {}) {
    patchWithCleanup(session, {mapbox_token: token});
    patchWithCleanup(assets, {
        loadJS: async () => Promise.resolve(),
        loadCSS: async () => Promise.resolve(),
    });
    const maps = [];
    const markers = [];
    class FullscreenControl {}
    class NavigationControl {
        constructor(options = {}) {
            this.options = options;
        }
    }
    class Popup {
        setText(text) {
            this.text = text;
            return this;
        }
    }
    class Marker {
        constructor(options = {}) {
            this.options = options;
            this._lngLat = [0, 0];
            this._handlers = {};
            this._element = options.element || document.createElement("div");
            markers.push(this);
        }
        setLngLat(lngLat) {
            this._lngLat = lngLat;
            return this;
        }
        getLngLat() {
            return {lng: this._lngLat[0], lat: this._lngLat[1]};
        }
        addTo() {
            return this;
        }
        remove() {
            return undefined;
        }
        on(event, callback) {
            this._handlers[event] = callback;
            return this;
        }
        setPopup(popup) {
            this.popup = popup;
            return this;
        }
        getElement() {
            return this._element;
        }
        fire(event) {
            if (this._handlers[event]) {
                this._handlers[event]();
            }
        }
    }
    class Map {
        constructor(options) {
            this.options = options;
            this.controls = [];
            this._handlers = {};
            this._once = {};
            this.style = options.style;
            this.pitch = options.pitch;
            this.dragRotateDisabledRotation = false;
            this.touchZoomRotateDisabledRotation = false;
            this.keyboardDisabledBearing = false;
            this.keyboardDisabledZoom = false;
            this.keyboardDisabledPan = false;
            this.keyboardDisabledPitch = false;
            this.dragRotate = {
                disableRotation: () => {
                    this.dragRotateDisabledRotation = true;
                },
            };
            this.touchZoomRotate = {
                disableRotation: () => {
                    this.touchZoomRotateDisabledRotation = true;
                },
            };
            this.keyboard = {
                disableBearing: () => {
                    this.keyboardDisabledBearing = true;
                },
                disableZoom: () => {
                    this.keyboardDisabledZoom = true;
                },
                disablePan: () => {
                    this.keyboardDisabledPan = true;
                },
                disablePitch: () => {
                    this.keyboardDisabledPitch = true;
                },
            };
            maps.push(this);
        }
        addControl(control) {
            this.controls.push(control);
            if (control.onAdd) {
                const node = control.onAdd(this);
                if (this.options.container && node) {
                    this.options.container.appendChild(node);
                }
            }
        }
        on(event, callback) {
            this._handlers[event] = callback;
        }
        once(event, callback) {
            this._once[event] = callback;
        }
        setStyle(style) {
            this.style = style;
            if (this._once["style.load"]) {
                this._once["style.load"]();
            }
        }
        getPitch() {
            return this.pitch;
        }
        setPitch(pitch) {
            this.pitch = pitch;
        }
        resize() {
            return undefined;
        }
        getContainer() {
            return this.options.container;
        }
        remove() {
            return undefined;
        }
    }
    const mapboxgl = {Map, Marker, Popup, NavigationControl, FullscreenControl};
    const previous = window.mapboxgl;
    window.mapboxgl = mapboxgl;
    after(() => {
        window.mapboxgl = previous;
    });
    return {maps, markers, FullscreenControl, NavigationControl};
}

/**
 * @param {Object} payload
 * @param {Object} [options]
 */
async function mountMap(payload, options = {}) {
    Partner._records[0].map_data = payload;
    const mocks = installMapboxMocks(options);
    const view = await mountView({
        type: "form",
        resModel: "partner",
        resId: 1,
        arch: options.arch || `<form><field name="map_data" widget="mapbox"/></form>`,
    });
    await animationFrame();
    return {view, ...mocks};
}

describe("web_widget_mapbox", () => {
    beforeEach(() => {
        browser.localStorage.removeItem(MAPBOX_STYLE_STORAGE_KEY);
    });
    test("missing token shows a placeholder and does not construct Map", async () => {
        const {maps} = await mountMap(makePayload(), {token: false});
        expect(".o_mapbox_placeholder").toHaveCount(1);
        expect(".o_mapbox_placeholder").toHaveText(/Mapbox Token/);
        expect(maps).toHaveLength(0);
    });

    test("cdn stylesheet failure shows a placeholder after the map library loads", async () => {
        Partner._records[0].map_data = makePayload();
        installMapboxMocks();
        patchWithCleanup(assets, {
            loadJS: async () => Promise.resolve(),
            loadCSS: async () => {
                await Promise.resolve();
                throw new AssetsLoadingError("css");
            },
        });
        await mountView({
            type: "form",
            resModel: "partner",
            resId: 1,
            arch: `<form><field name="map_data" widget="mapbox"/></form>`,
        });
        await animationFrame();
        expect(".o_mapbox_placeholder").toHaveCount(1);
        expect(".o_mapbox_placeholder").toHaveText(/api.mapbox.com/);
    });

    test("pending stylesheet load does not block Map construction", async () => {
        let resolveCss = () => undefined;
        const cssLoaded = new Promise((resolve) => {
            resolveCss = resolve;
        });
        after(() => resolveCss());
        Partner._records[0].map_data = makePayload();
        const mocks = installMapboxMocks();
        patchWithCleanup(assets, {
            loadJS: async () => Promise.resolve(),
            loadCSS: async () => cssLoaded,
        });
        await mountView({
            type: "form",
            resModel: "partner",
            resId: 1,
            arch: `<form><field name="map_data" widget="mapbox"/></form>`,
        });
        await animationFrame();
        expect(mocks.maps).toHaveLength(1);
        expect(".o_mapbox_placeholder").toHaveCount(0);
    });

    test("cdn failure shows a placeholder and does not construct Map", async () => {
        Partner._records[0].map_data = makePayload();
        patchWithCleanup(session, {mapbox_token: "pk.test"});
        patchWithCleanup(assets, {
            loadJS: async () => {
                throw new AssetsLoadingError("cdn");
            },
            loadCSS: async () => Promise.resolve(),
        });
        const maps = [];
        const previous = window.mapboxgl;
        window.mapboxgl = {
            Map: class {
                constructor() {
                    maps.push(this);
                }
            },
        };
        after(() => {
            window.mapboxgl = previous;
        });
        await mountView({
            type: "form",
            resModel: "partner",
            resId: 1,
            arch: `<form><field name="map_data" widget="mapbox"/></form>`,
        });
        expect(".o_mapbox_placeholder").toHaveCount(1);
        expect(".o_mapbox_placeholder").toHaveText(/api.mapbox.com/);
        expect(maps).toHaveLength(0);
    });

    test("two valid elements without default_center use the first pin as center", async () => {
        const {maps, markers} = await mountMap(makePayload());
        expect(maps).toHaveLength(1);
        expect(markers).toHaveLength(2);
        expect(maps[0].options.center).toEqual([4.89, 52.37]);
        expect(maps[0].options.zoom).toBe(12);
    });

    test("valid default_center overrides the first pin", async () => {
        const {maps} = await mountMap(
            makePayload({
                default_center: {lat: 1.5, lon: 2.5},
            })
        );
        expect(maps[0].options.center).toEqual([2.5, 1.5]);
    });

    test("invalid default_center falls through to the first pin", async () => {
        const {maps} = await mountMap(
            makePayload({
                default_center: {lat: 91, lon: 4.89},
            })
        );
        expect(maps[0].options.center).toEqual([4.89, 52.37]);
    });

    test("invalid lat/lon elements are skipped", async () => {
        const {markers, maps} = await mountMap({
            elements: [
                {lat: 200, lon: 0, label: "bad"},
                {lat: 52.37, lon: 4.89, label: "ok"},
            ],
        });
        expect(markers).toHaveLength(1);
        expect(maps[0].options.center).toEqual([4.89, 52.37]);
    });

    test("editable dragend writes updated without changing elements", async () => {
        const {view, markers} = await mountMap(makePayload());
        markers[1].setLngLat([4.902, 52.381]);
        markers[1].fire("dragend");
        await animationFrame();
        const field = findComponent(
            view,
            (component) => component instanceof MapboxField
        );
        const value = field.props.record.data.map_data;
        expect(value.elements[1].lat).toBe(52.38);
        expect(value.elements[1].lon).toBe(4.9);
        expect(value.updated).toEqual([
            {
                lat: 52.381,
                lon: 4.902,
                label: "Depot",
                editable: true,
                clickable: true,
                rec_model: "res.partner",
                rec_id: 12,
                index: 1,
            },
        ]);
    });

    test("editable omitted is not draggable", async () => {
        const {markers} = await mountMap(makePayload());
        expect(markers[0].options.draggable).toBe(false);
        expect(markers[1].options.draggable).toBe(true);
    });

    test("earlier elements stack above later markers at the same location", async () => {
        const {markers} = await mountMap({
            elements: [
                {
                    lat: 52.37,
                    lon: 4.89,
                    editable: true,
                    icon: "star",
                    size: 32,
                },
                {
                    lat: 52.37,
                    lon: 4.89,
                    clickable: true,
                    rec_model: "res.partner",
                    rec_id: 12,
                    icon: "map-marker",
                    size: 20,
                },
                {
                    lat: 52.37,
                    lon: 4.89,
                    clickable: true,
                    rec_model: "res.partner",
                    rec_id: 13,
                    icon: "map-marker",
                    size: 20,
                },
            ],
        });
        expect(markers).toHaveLength(3);
        expect(markers[0].options.draggable).toBe(true);
        expect(markers[1].options.draggable).toBe(false);
        expect(markers[0].getElement().style.zIndex).toBe("3");
        expect(markers[1].getElement().style.zIndex).toBe("2");
        expect(markers[2].getElement().style.zIndex).toBe("1");
    });

    test("hex color is applied to the default pin", async () => {
        const {markers} = await mountMap({
            elements: [{lat: 52.37, lon: 4.89, color: "#FF0000"}],
        });
        expect(markers[0].options.color).toBe("#FF0000");
        expect(markers[0].options.element).toBe(undefined);
    });

    test("hex color is applied to a custom icon", async () => {
        const {markers} = await mountMap({
            elements: [{lat: 52.37, lon: 4.89, icon: "star", size: 32, color: "#0a0"}],
        });
        expect(markers[0].options.element.style.color).toBe("#0a0");
        expect(markers[0].options.color).toBe(undefined);
    });

    test("invalid color is ignored", async () => {
        const {markers} = await mountMap({
            elements: [
                {lat: 52.37, lon: 4.89, color: "red"},
                {lat: 52.38, lon: 4.9, color: "FF0000"},
                {lat: 52.39, lon: 4.91, icon: "star", color: "#GG0000"},
            ],
        });
        expect(markers[0].options.color).toBe(undefined);
        expect(markers[1].options.color).toBe(undefined);
        expect(markers[2].options.color).toBe(undefined);
        expect(markers[2].options.element.style.color).toBe("");
    });

    test("readonly field is not draggable even when editable is true", async () => {
        const {markers} = await mountMap(makePayload(), {
            arch: `<form><field name="map_data" widget="mapbox" readonly="1"/></form>`,
        });
        expect(markers[0].options.draggable).toBe(false);
        expect(markers[1].options.draggable).toBe(false);
    });

    test("readonly modifier rebuilds markers when elements are unchanged", async () => {
        Partner._records[0].map_data = makePayload();
        Partner._records[0].bar = false;
        const {markers} = installMapboxMocks();
        await mountView({
            type: "form",
            resModel: "partner",
            resId: 1,
            arch: `
                <form>
                    <field name="bar"/>
                    <field name="map_data" widget="mapbox" readonly="bar"/>
                </form>
            `,
        });
        await animationFrame();
        expect(markers).toHaveLength(2);
        expect(markers[1].options.draggable).toBe(true);
        await contains(".o_field_widget[name=bar] input").click();
        await animationFrame();
        expect(markers).toHaveLength(4);
        expect(markers[3].options.draggable).toBe(false);
        expect(markers[2].options.draggable).toBe(false);
    });

    test("clickable triple opens FormViewDialog", async () => {
        mockService("dialog", {
            add(dialogClass, props) {
                expect(dialogClass).toBe(FormViewDialog);
                expect.step(`${props.resModel}:${props.resId}`);
                return () => undefined;
            },
        });
        const {markers} = await mountMap(makePayload());
        markers[1].getElement().click();
        await animationFrame();
        expect.verifySteps(["res.partner:12"]);
    });

    test("clickable marker exits fullscreen before opening the form", async () => {
        mockService("dialog", {
            add(dialogClass, props) {
                expect.step(`${props.resModel}:${props.resId}`);
                return () => undefined;
            },
        });
        const {maps, markers} = await mountMap(makePayload());
        let resized = 0;
        maps[0].resize = () => {
            resized += 1;
        };
        let fullscreenEl = maps[0].options.container;
        patchWithCleanup(document, {
            get fullscreenElement() {
                return fullscreenEl;
            },
            exitFullscreen() {
                expect.step("exitFullscreen");
                fullscreenEl = null;
                return Promise.resolve();
            },
        });
        markers[1].getElement().click();
        await animationFrame();
        expect(resized).toBeGreaterThan(0);
        expect.verifySteps(["exitFullscreen", "res.partner:12"]);
    });

    test("incomplete clickable triple does not open a dialog", async () => {
        mockService("dialog", {
            add() {
                expect.step("dialog");
                return () => undefined;
            },
        });
        const {markers} = await mountMap({
            elements: [
                {
                    lat: 52.37,
                    lon: 4.89,
                    clickable: true,
                    rec_model: "res.partner",
                },
            ],
        });
        markers[0].getElement().click();
        await animationFrame();
        expect.verifySteps([]);
    });

    test("allow_fullscreen false skips FullscreenControl", async () => {
        const {maps, FullscreenControl} = await mountMap(
            makePayload({allow_fullscreen: false})
        );
        expect(maps[0].controls.some((ctrl) => ctrl instanceof FullscreenControl)).toBe(
            false
        );
    });

    test("allow_fullscreen omitted adds FullscreenControl", async () => {
        const {maps, FullscreenControl} = await mountMap(makePayload());
        expect(maps[0].controls.some((ctrl) => ctrl instanceof FullscreenControl)).toBe(
            true
        );
    });

    test("allow_zoom pan and pitch false match handler options", async () => {
        const {maps, NavigationControl} = await mountMap(
            makePayload({
                allow_zoom: false,
                allow_pan: false,
                allow_pitch: false,
            })
        );
        const options = maps[0].options;
        expect(options.scrollZoom).toBe(false);
        expect(options.boxZoom).toBe(false);
        expect(options.doubleClickZoom).toBe(false);
        expect(options.touchZoomRotate).toBe(false);
        expect(options.dragPan).toBe(false);
        expect(options.touchPitch).toBe(false);
        expect(options.pitchWithRotate).toBe(false);
        expect(options.dragRotate).toBe(false);
        expect(maps[0].keyboardDisabledBearing).toBe(true);
        expect(maps[0].keyboardDisabledZoom).toBe(true);
        expect(maps[0].keyboardDisabledPan).toBe(true);
        expect(maps[0].keyboardDisabledPitch).toBe(true);
        expect(maps[0].dragRotateDisabledRotation).toBe(false);
        expect(maps[0].touchZoomRotateDisabledRotation).toBe(false);
        expect(maps[0].controls.some((ctrl) => ctrl instanceof NavigationControl)).toBe(
            false
        );
    });

    test("default allow flags keep zoom pitch handlers and disable rotation only", async () => {
        const {maps, NavigationControl} = await mountMap(makePayload());
        const options = maps[0].options;
        expect(options.scrollZoom).toBe(true);
        expect(options.touchZoomRotate).toBe(true);
        expect(options.dragPan).toBe(true);
        expect(options.dragRotate).toBe(true);
        expect(options.touchPitch).toBe(true);
        expect(maps[0].keyboardDisabledBearing).toBe(true);
        expect(maps[0].keyboardDisabledZoom).toBe(false);
        expect(maps[0].keyboardDisabledPan).toBe(false);
        expect(maps[0].keyboardDisabledPitch).toBe(false);
        expect(maps[0].dragRotateDisabledRotation).toBe(true);
        expect(maps[0].touchZoomRotateDisabledRotation).toBe(true);
        expect(maps[0].controls.some((ctrl) => ctrl instanceof NavigationControl)).toBe(
            true
        );
    });

    test("Map / Satellite control calls setStyle", async () => {
        const {maps} = await mountMap(makePayload());
        await contains(".o_mapbox_style_satellite").click();
        expect(maps[0].style).toBe("mapbox://styles/mapbox/satellite-streets-v12");
        expect(browser.localStorage.getItem(MAPBOX_STYLE_STORAGE_KEY)).toBe(
            "satellite"
        );
        await contains(".o_mapbox_style_map").click();
        expect(maps[0].style).toBe("mapbox://styles/mapbox/streets-v12");
        expect(browser.localStorage.getItem(MAPBOX_STYLE_STORAGE_KEY)).toBe("map");
    });

    test("stored satellite style is used for a new widget", async () => {
        browser.localStorage.setItem(MAPBOX_STYLE_STORAGE_KEY, "satellite");
        const {maps} = await mountMap(
            makePayload({
                style: {
                    map: "mapbox://styles/mapbox/light-v11",
                    satellite: "mapbox://styles/mapbox/dark-v11",
                },
            })
        );
        expect(maps[0].options.style).toBe("mapbox://styles/mapbox/dark-v11");
    });

    test("invalid stored style falls back to map", async () => {
        browser.localStorage.setItem(MAPBOX_STYLE_STORAGE_KEY, "terrain");
        const {maps} = await mountMap(makePayload());
        expect(maps[0].options.style).toBe("mapbox://styles/mapbox/streets-v12");
    });

    test("style choice applies to every mapbox widget", async () => {
        const {maps} = await mountMap(makePayload(), {
            arch: `<form>
                <field name="map_data" widget="mapbox"/>
                <field name="map_data" widget="mapbox"/>
            </form>`,
        });
        expect(maps).toHaveLength(2);
        await contains(".o_field_mapbox .o_mapbox_style_satellite").click();
        expect(maps[0].style).toBe("mapbox://styles/mapbox/satellite-streets-v12");
        expect(maps[1].style).toBe("mapbox://styles/mapbox/satellite-streets-v12");
        expect(browser.localStorage.getItem(MAPBOX_STYLE_STORAGE_KEY)).toBe(
            "satellite"
        );
    });

    test("custom style URLs are used for Map and Satellite", async () => {
        const {maps} = await mountMap(
            makePayload({
                style: {
                    map: "mapbox://styles/mapbox/light-v11",
                    satellite: "mapbox://styles/mapbox/dark-v11",
                },
            })
        );
        expect(maps[0].options.style).toBe("mapbox://styles/mapbox/light-v11");
        await contains(".o_mapbox_style_satellite").click();
        expect(maps[0].style).toBe("mapbox://styles/mapbox/dark-v11");
    });

    test("config change recreates the map when elements are unchanged", async () => {
        const {view, maps, NavigationControl} = await mountMap(
            makePayload({
                default_center: {lat: 1, lon: 2},
                default_zoom: 8,
                default_pitch: 10,
            })
        );
        expect(maps).toHaveLength(1);
        expect(maps[0].options.center).toEqual([2, 1]);
        expect(maps[0].options.zoom).toBe(8);
        expect(maps[0].options.pitch).toBe(10);
        const field = findComponent(
            view,
            (component) => component instanceof MapboxField
        );
        await field.props.record.update({
            map_data: makePayload({
                default_center: {lat: 10, lon: 20},
                default_zoom: 4,
                default_pitch: 30,
                allow_zoom: false,
                style: {
                    map: "mapbox://styles/mapbox/light-v11",
                    satellite: "mapbox://styles/mapbox/dark-v11",
                },
            }),
        });
        await animationFrame();
        expect(maps).toHaveLength(2);
        expect(maps[1].options.center).toEqual([20, 10]);
        expect(maps[1].options.zoom).toBe(4);
        expect(maps[1].options.pitch).toBe(30);
        expect(maps[1].options.style).toBe("mapbox://styles/mapbox/light-v11");
        expect(maps[1].options.scrollZoom).toBe(false);
        expect(maps[1].controls.some((ctrl) => ctrl instanceof NavigationControl)).toBe(
            false
        );
    });

    test("pager to another record applies that record's camera and styles", async () => {
        const previousRecords = Partner._records;
        Partner._records = [
            {
                id: 1,
                map_data: makePayload({
                    default_center: {lat: 1, lon: 2},
                }),
            },
            {
                id: 2,
                map_data: makePayload({
                    default_center: {lat: 10, lon: 20},
                    style: {
                        map: "mapbox://styles/mapbox/light-v11",
                        satellite: "mapbox://styles/mapbox/dark-v11",
                    },
                }),
            },
        ];
        after(() => {
            Partner._records = previousRecords;
        });
        const mocks = installMapboxMocks();
        await mountView({
            type: "form",
            resModel: "partner",
            resId: 1,
            resIds: [1, 2],
            arch: `<form><field name="map_data" widget="mapbox"/></form>`,
        });
        await animationFrame();
        expect(mocks.maps[0].options.center).toEqual([2, 1]);
        await contains(".o_pager_next").click();
        await animationFrame();
        expect(mocks.maps).toHaveLength(2);
        expect(mocks.maps[1].options.center).toEqual([20, 10]);
        expect(mocks.maps[1].options.style).toBe("mapbox://styles/mapbox/light-v11");
        await contains(".o_mapbox_style_satellite").click();
        expect(mocks.maps[1].style).toBe("mapbox://styles/mapbox/dark-v11");
    });
});

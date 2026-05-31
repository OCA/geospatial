import {Component, useRef} from "@odoo/owl";
import {Layout} from "@web/search/layout";
import {MapRenderer} from "./leaflet_map_renderer.esm";
import {SearchBar} from "@web/search/search_bar/search_bar";
import {useSearchBarToggler} from "@web/search/search_bar/search_bar_toggler";
import {executeButtonCallback} from "@web/views/view_button/view_button_hook";

/**
 * Controller class for the Map view, setting up the environment configuration.
 */
export class MapController extends Component {
    static template = "web_view_leaflet_map.MapView";
    static components = {Layout, MapRenderer, SearchBar};

    setup() {
        this.rootRef = useRef("root");
        this.searchBarToggler = useSearchBarToggler();
    }

    async onClickCreate() {
        return executeButtonCallback(this.rootRef.el, () => this.createRecord());
    }

    async createRecord() {
        await this.props.createRecord();
    }
}

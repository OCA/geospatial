import {Component, onMounted, useRef} from "@odoo/owl";
import {Layout} from "@web/search/layout";
import {MapRenderer} from "./leaflet_map_renderer.esm";
import {SearchBar} from "@web/search/search_bar/search_bar";
import {executeButtonCallback} from "@web/views/view_button/view_button_hook";
import {useSearchBarToggler} from "@web/search/search_bar/search_bar_toggler";

/**
 * Controller class for the Map view, setting up the environment configuration.
 */
export class MapController extends Component {
    static template = "web_view_leaflet_map.MapView";
    static components = {Layout, MapRenderer, SearchBar};

    setup() {
        this.rootRef = useRef("root");
        this.searchBarToggler = useSearchBarToggler();
        this.firstLoad = true;
        onMounted(() => {
            this.firstLoad = false;
        });
    }

    get display() {
        const {controlPanel} = this.props.display;

        if (!controlPanel) {
            return this.props.display;
        }

        return {
            ...this.props.display,
            controlPanel: {
                ...controlPanel,
                layoutActions: true,
            },
        };
    }

    async onClickCreate() {
        return executeButtonCallback(this.rootRef.el, () => this.createRecord());
    }

    async createRecord() {
        await this.props.createRecord();
    }
}

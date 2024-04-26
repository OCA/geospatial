/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Component, useRef} from "@odoo/owl";

export class SearchBarRecords extends Component {
    setup() {
        this.searchComponentRef = useRef("searchComponent");
    }

    /**
     * When a key is pressed, the props onInputKeyup method is called.
     * @param {*} ev
     */
    onInputKeyup(ev) {
        this.props.onInputKeyup(this.searchComponentRef.el.value);
        ev.preventDefault();
        ev.stopPropagation();
    }
}

SearchBarRecords.template = "base_geoengine.SearchBarRecords";
SearchBarRecords.props = {
    onInputKeyup: {type: Function},
};

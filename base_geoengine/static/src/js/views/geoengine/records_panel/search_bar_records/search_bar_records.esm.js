/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Component, signal, t, useProps} from "@odoo/owl";

export class SearchBarRecords extends Component {
    props = useProps({
        onInputKeyup: t.function(),
    });

    searchComponentRef = signal.ref();

    /**
     * When a key is pressed, the props onInputKeyup method is called.
     * @param {*} ev
     */
    onInputKeyup(ev) {
        this.props.onInputKeyup(this.searchComponentRef().value);
        ev.preventDefault();
        ev.stopPropagation();
    }
}

SearchBarRecords.template = "base_geoengine.SearchBarRecords";

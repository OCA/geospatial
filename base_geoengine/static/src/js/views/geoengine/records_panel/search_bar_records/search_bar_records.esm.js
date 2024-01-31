/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

const {Component, useRef} = owl;

export class SearchBarRecords extends Component {
    setup() {
        this.searchComponentRef = useRef("searchComponent");
    }

    onInputKeyup(ev) {
        this.props.onInputKeyup(this.searchComponentRef.el.value);
        ev.preventDefault();
        ev.stopPropagation();
    }
}

SearchBarRecords.template = "base_geoengine.SearchBarRecords";

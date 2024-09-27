/** @odoo-module **/

import {DomainField, domainField} from "@web/views/fields/domain/domain_field";

export class DomainFieldExtend extends DomainField {
    async loadCount(props) {
        if (!this.getResModel(props)) {
            Object.assign(this.state, {recordCount: 0, isValid: true});
        }

        let recordCount = 0;
        try {
            let value = props.value.slice();
            value = value.replace("not in active_ids", "not in");
            value = value.replace("in active_ids", "in");
            value = value.replace('"{ACTIVE_IDS}"', "[]");
            const domain = this.getDomain(value).toList(this.getContext(props));
            recordCount = await this.orm.silent.call(
                this.getResModel(props),
                "search_count",
                [domain],
                {context: this.getContext(props)}
            );
        } catch (_e) {
            // WOWL TODO: rethrow error when not the expected type
            Object.assign(this.state, {recordCount: 0, isValid: false});
            return;
        }
        Object.assign(this.state, {recordCount, isValid: true});
    }
}

domainField.component = DomainFieldExtend;

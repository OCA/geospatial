/** @odoo-module */
export function onDidChange(action) {
    return function (oldOperator, fieldChange) {
        if (this.category !== oldOperator.category) {
            return action(fieldChange);
        }
        return {};
    };
}

/** @odoo-module */

/**
 * This is method is called when an operator changes its value.
 */
export function onDidChange(action) {
    return function (oldOperator, fieldChange) {
        if (this.category !== oldOperator.category) {
            return action(fieldChange);
        }
        return {};
    };
}

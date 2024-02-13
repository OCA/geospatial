// Copyright 2020 Tecnativa - Alexandre Díaz
// License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).
odoo.define("website_snippet_product_category.s_product_category", function (require) {
    "use strict";

    const core = require("web.core");
    const sAnimation = require("website.content.snippets.animation");

    const _t = core._t;

    sAnimation.registry.js_product_category = sAnimation.Class.extend({
        selector: ".js_product_category",
        disabledInEditableMode: false,

        /**
         * Asynchronous server side template rendering
         * @override
         */
        start: function () {
            const _this = this;
            const template =
                this.$target.data("template") ||
                "website_snippet_product_category.s_product_category_items";
            // Prevent user edition
            this.$target.attr("contenteditable", "false");

            const def = this._rpc({
                route: "/website_sale/render_product_category",
                params: {
                    template: template,
                },
            }).then(
                function (object_html) {
                    const $object_html = $(object_html);
                    const count = $object_html.find("input[name='object_count']").val();
                    if (!count) {
                        _this.$target.append(
                            $("<div/>").append(
                                $("<div/>", {
                                    class:
                                        "alert alert-warning" +
                                        " alert-dismissible text-center",
                                    text: _t(
                                        "No categories were found. Make" +
                                            " sure you have categories" +
                                            " defined."
                                    ),
                                })
                            )
                        );
                        return;
                    }

                    _this.$target.html($object_html);
                },
                function () {
                    if (_this.editableMode) {
                        _this.$target.append(
                            $("<p/>", {
                                class: "text-danger",
                                text: _t(
                                    "An error occured with this product" +
                                        " categories block. If the problem" +
                                        " persists, please consider deleting" +
                                        " it and adding a new one"
                                ),
                            })
                        );
                    }
                }
            );
            return $.when(this._super.apply(this, arguments), def);
        },

        /**
         * @override
         */
        destroy: function () {
            this.$target.empty();
            this._super.apply(this, arguments);
        },
    });
});

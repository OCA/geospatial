# Copyright 2020 Tecnativa - Alexandre Díaz
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl).
{
    "name": "Website Snippet Product Category",
    "category": "Website",
    "summary": "Adds a new snippet to show e-commerce categories",
    "version": "16.0.1.0.0",
    "license": "LGPL-3",
    "website": "https://github.com/OCA/e-commerce",
    "author": "Tecnativa, Odoo Community Association (OCA)",
    "depends": ["website_sale"],
    "data": [
        "templates/snippets.xml",
        "views/product_public_category.xml",
    ],
    "assets": {
        "web.assets_frontend": [
            "website_snippet_product_category/static/src/scss/snippet.scss",
            "website_snippet_product_category/static/src/js/frontend.js",
        ],
        "website.assets_editor": [
            "website_snippet_product_category/static/src/js/snippet.options.js",
        ],
    },
    "demo": ["demo/demo.xml", "demo/pages.xml"],
    "maintainers": ["Tardo"],
    "installable": True,
}

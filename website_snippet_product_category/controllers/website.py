# Copyright 2020 Tecnativa - Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import http
from odoo.http import request

from odoo.addons.website.controllers.main import QueryURL


class Website(http.Controller):
    @http.route(
        ["/website_sale/render_product_category"],
        type="json",
        auth="public",
        website=True,
    )
    def render_product_category(self, template, **kwargs):
        categories = request.env["product.public.category"].search(
            [
                ("parent_id", "=", False),
                ("published_in_product_category_snippet", "=", True),
            ]
        )
        keep = QueryURL("/shop", category=0)
        return request.env["ir.qweb"]._render(
            template, {"object": categories, "keep": keep}
        )

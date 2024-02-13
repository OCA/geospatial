# Copyright 2020 Tecnativa - Alexandre Díaz
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models


class ProductPublicCategory(models.Model):
    _inherit = "product.public.category"

    published_in_product_category_snippet = fields.Boolean(
        "Published in product category snippet", copy=False
    )

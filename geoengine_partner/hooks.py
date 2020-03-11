# Copyright 2016 Tecnativa <vicent.cubells@tecnativa.com>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, SUPERUSER_ID


def post_init_hook(cr, registry):
    """
    This post-init-hook will update all partner already localize with geo point.
    """
    env = api.Environment(cr, SUPERUSER_ID, dict())
    # import pdb;pdb.set_trace()
    partner_obj = env['res.partner']
    partners = partner_obj.search([], order="id")
    for partner in partners:
        partner._set_partner_point()

        # if not partner.partner_latitude or not partner.partner_longitude:
        #     partner.partner_point = False
        # else:
        #     print("Ok_Point {}".format(partner.name))
        #     partner.partner_point = fields.GeoPoint.from_latlon(
        #         partner.partner_latitude, partner.partner_longitude)


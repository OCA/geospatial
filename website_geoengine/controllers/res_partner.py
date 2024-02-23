# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import http, models


class ResPartner(http.Controller):

    @http.route(
        "/geodatas/res_partner/stores",
        type="json",
        auth="public",
        website=True,
        sitemap=False,
        csrf=False,
        methods=["POST"],
    )
    def geodatas_partner_stores(self, **kw):
        return http.request.env["res.partner"].fetch_partner_geoengine(tag={}, lang="en_US")
    
    

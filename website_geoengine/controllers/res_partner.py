# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import http


class ResPartner(http.Controller):
    @http.route("/website-geoengine/tags", type="json", auth="public", cors="*")
    def tags(self, **kw):
        tags = kw.get("tags", {})
        lang = kw.get("lang", "en_US")
        return http.request.env["res.partner"].get_search_tags(tags, lang)

    @http.route("/website-geoengine/partners", type="json", auth="public", cors="*")
    def partners(self, **kw):
        tags = kw.get("tags", {})
        lang = kw.get("lang", "en_US")
        maxResults = kw.get("maxResults", "200")
        return http.request.env["res.partner"].fetch_partner_geoengine(
            tags, lang, maxResults
        )

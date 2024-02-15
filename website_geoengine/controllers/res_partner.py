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
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [6.5, 46.5]},
                    "properties": {
                        "id": 1,
                        "name": "Stéphane Bruner",
                        "zip": "5000",
                        "city": "Lausanne",
                        "street": "Rue de Busigny 28",
                        "street2": "",
                        "tags": "big,blue,dev",
                        "openning_hours": "Mo-Fr 08:00-12:00,13:00-17:00",
                    },
                },
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [4.9, 50.5]},
                    "properties": {
                        "id": 2,
                        "name": "Hadrien Huvelle",
                        "zip": "5000",
                        "city": "Namur",
                        "street": "Rue Denis-Georges Bayar 58",
                        "street2": "RDC",
                        "tags": "small,red,archi",
                        "openning_hours": "Mo-Fr 09:00-12:00,13:00-18:00",
                    },
                },
            ],
        }

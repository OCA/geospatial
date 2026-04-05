# Copyright 2024 Camptocamp SA, Caravanes Treyvaud S.A.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import logging

from odoo import api, models

from odoo.addons.base_geoengine.fields import GeoField

_logger = logging.getLogger(__name__)


class Base(models.AbstractModel):
    _inherit = "base"

    def _has_geo_field_srid(self, srid):
        """Check if the current model has any geo field with the given SRID."""
        for field in self._fields.values():
            if isinstance(field, GeoField) and getattr(field, "srid", 0) == srid:
                return True
        return False

    def _resolve_geo_field_srid(self, geo_field_id):
        """Resolve the SRID from a geo_field_id tuple (id, name, display)."""
        if not geo_field_id:
            return 3857
        field_id = (
            geo_field_id[0] if isinstance(geo_field_id, (list, tuple)) else geo_field_id
        )
        ir_field = self.env["ir.model.fields"].browse(field_id).exists()
        if ir_field:
            model_name = ir_field.model
            field_name = ir_field.name
            if model_name in self.env:
                field = self.env[model_name]._fields.get(field_name)
                if field and hasattr(field, "srid"):
                    return field.srid or 3857
        return 3857

    @api.model
    def get_geoengine_layers(self, view_id=None, view_type="geoengine", **options):
        result = super().get_geoengine_layers(
            view_id=view_id, view_type=view_type, **options
        )

        swisstopo_compatible = False
        for layer in result.get("actives", []):
            srid = self._resolve_geo_field_srid(layer.get("geo_field_id"))
            layer["geo_field_srid"] = srid
            if srid == 2056:
                swisstopo_compatible = True

        # Fallback: check current model's own fields
        if not swisstopo_compatible:
            swisstopo_compatible = self._has_geo_field_srid(2056)

        # Resolve the view to get its ID for the JS layer creation
        if not view_id:
            view = self._get_geo_view()
        else:
            view = self.env["ir.ui.view"].browse(view_id)

        has_swisstopo_layers = any(
            bg.get("raster_type") == "swisstopo" for bg in result.get("backgrounds", [])
        )

        result["swisstopo_compatible"] = swisstopo_compatible
        result["has_swisstopo_layers"] = has_swisstopo_layers
        result["geo_view_id"] = view.id

        return result

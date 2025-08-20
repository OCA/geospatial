#############################################################################
#
#    Odoo OGC API
#
#    Copyright (C) 2025-TODAY Geon Information Technologies Inc. (<https://www.geonbt.com.tr>)
#    Copyright (C) 2025-TODAY Nezih Gülesanlar (<postanezih@gmail.com>)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
#############################################################################

import json
import logging
import xml.etree.ElementTree as ET

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

from odoo.addons.http_routing.models.ir_http import slugify

_logger = logging.getLogger(__name__)


DEFAULT_CRS = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"


class OgcapiCollection(models.Model):
    """OGC API Collection Model."""

    _name = "ogcapi.collection"
    _description = "OGC API Collections"
    _inherit = ["ogcapi.core.mixin", "ogcapi.feature.mixin"]
    _sql_constraints = [
        (
            "unique_name_workspace_id",
            "unique(name, workspace_id)",
            "The combination of Name and Related Workspace must be unique!",
        ),
    ]

    name = fields.Char(required=True)

    title = fields.Char(required=True)
    description = fields.Char()

    geo_field_name = fields.Char(
        string="Geometry Field Name",
        help="Select the geometry field for this collection.",
    )

    geo_type = fields.Selection(
        selection=[
            ("Point", "Point"),
            ("LineString", "LineString"),
            ("Polygon", "Polygon"),
            ("MultiPoint", "MultiPoint"),
            ("MultiLineString", "MultiLineString"),
            ("MultiPolygon", "MultiPolygon"),
        ],
        string="Geometry Type",
        help=(
            "Type of the geometry field (e.g., Point, LineString, Polygon, "
            "MultiPoint, MultiLineString, MultiPolygon)"
        ),
    )
    geo_srid = fields.Integer(
        string="Storage SRID",
        help=("Spatial Reference Identifier (SRID) for" " the storage of geometries."),
    )
    geo_dimension = fields.Integer(
        string="Geometry Dimension",
        help="Dimension of the geometry field (2 for 2D, 3 for 3D geometries)",
    )
    geo_view_fields = fields.Text(
        string="Geoengine View Fields",
    )
    extent = fields.Char(
        help=(
            "Spatial extent of the collection in comma-separated values "
            "minX, minY, maxX, maxY with EPSG:4326 (longitude, latitude)"
        ),
    )

    schema = fields.Text(
        "Properties Schema",
        help=("JSON schema for the properties of the features " "in this collection."),
    )

    # Relations

    workspace_id = fields.Many2one(
        "ogcapi.workspace", string="Related Workspace", required=True
    )
    model_id = fields.Many2one(
        "ir.model",
        string="Related Model",
        ondelete="set null",
        domain=lambda self: self.geoengine_model_domain(),
    )
    geo_field_id = fields.Many2one(
        "ir.model.fields",
        string="Geometry Field",
        domain="[('model_id', '=', model_id), ('ttype', 'in', ["
        "'geo_point','geo_line','geo_polygon',"
        "'geo_multi_point','geo_multi_line','geo_multi_polygon'])]",
        help="Select the geometry field for this collection.",
    )

    # Computed fields

    slug = fields.Char(
        "Workspace Slug",
        compute="_compute_slug",
        store=True,
        index=True,
        readonly=True,
    )

    extent_json = fields.Json(
        string="Extent GeoJSON",
        compute="_compute_extent_json",
        store=True,
        help=(
            "Spatial extent of the collection in GeoJSON format "
            "[minX, minY, maxX, maxY] with EPSG:4326 (longitude, latitude)"
        ),
    )
    geo_view_fields_json = fields.Json(
        compute="_compute_geo_view_fields_json",
        store=True,
    )

    # Constraints

    @api.constrains("geo_srid")
    def _check_geo_srid(self):
        """
        Constraint to ensure that the provided SRID exists in the PostGIS
        spatial_ref_sys table.
        Raises a ValidationError if the SRID is not found.
        """
        for rec in self:
            if rec.geo_srid:
                query = """
                    SELECT srid FROM spatial_ref_sys WHERE srid = %s
                """
                self.env.cr.execute(query, (rec.geo_srid,))
                result = self.env.cr.fetchone()
                if not result:
                    raise ValidationError(
                        _(
                            (
                                "SRID %(srid)s is not defined in "
                                "PostGIS spatial_ref_sys table!"
                            ),
                            srid=rec.geo_srid,
                        )
                    )

    # Onchange Methods

    @api.onchange("model_id")
    def _onchange_model_id(self):
        """
        Onchange handler for model_id.
        Sets default values for name, title, and description based on the
        selected model. Resets geometry-related fields.
        """
        if self.model_id:
            if not self.name:
                self.name = self.model_id.model.split(".")[-1]
            if not self.title:
                self.title = self.model_id.name
            if not self.description:
                self.description = self.model_id.name
        self.geo_field_id = False
        self.geo_view_fields = False
        self.geo_type = False
        self.geo_srid = False
        self.geo_dimension = False

    @api.onchange("geo_field_id")
    def _onchange_geo_field_id(self):
        """
        Onchange handler for geo_field_id.
        Sets geometry field name and updates geometry properties
        (type, SRID, dimension).
        """
        self.extent = False
        if not self.geo_field_id:
            self.geo_field_name = False
            self.geo_view_fields = False
            self.geo_type = False
            self.geo_srid = False
            self.geo_dimension = False
            return

        self.geo_field_name = self.geo_field_id.name if self.geo_field_id else False
        geo_props = self._get_geo_field_props()
        if geo_props:
            self.geo_view_fields = self._get_geo_view_fields()
            self.geo_type = geo_props.get("geo_type") or False
            self.geo_srid = int(geo_props.get("srid")) or False
            self.geo_dimension = geo_props.get("dim") or False

    # Compute Methods

    @api.depends("name")
    def _compute_slug(self):
        for rec in self:
            rec.slug = slugify(rec.name) if rec.name else ""

    @api.depends("extent")
    def _compute_extent_json(self):
        for rec in self:
            if rec.extent:
                try:
                    coords = [float(x) for x in rec.extent.split(",")]
                    rec.extent_json = coords if len(coords) == 4 else []
                except Exception as e:
                    _logger.warning("Extent parse error: %s", e)
                    rec.extent_json = []
            else:
                rec.extent_json = []

    @api.depends("geo_view_fields")
    def _compute_geo_view_fields_json(self):
        for rec in self:
            # geo_view_fields alanı comma-separated string ise
            if rec.geo_view_fields:
                # Boşlukları temizle, virgül ile ayır, boşları filtrele
                fields = [
                    f.strip() for f in rec.geo_view_fields.split(",") if f.strip()
                ]
                rec.geo_view_fields_json = fields
            else:
                rec.geo_view_fields_json = []

    @api.model
    def geoengine_model_domain(self):
        """
        Returns a domain for ir.model to filter only models
        with a geoengine view.
        :return: List of tuples representing the domain.
        """
        geoengine_views = self.env["ir.ui.view"].search([("type", "=", "geoengine")])
        model_names = geoengine_views.mapped("model")
        model_ids = self.env["ir.model"].search([("model", "in", model_names)]).ids
        return [("id", "in", model_ids)]

    # Actions

    def action_workspace_collection_items(self):
        """
        Returns an action to open the items of the related model in a tree,
        form, or geoengine view.
        :return: Dictionary representing the Odoo action.
        """
        if self.model_id:
            return {
                "name": _("Items"),
                "res_model": self.model_id.model,
                "view_mode": "tree,form,geoengine",
                "context": {},
                "domain": [],
                "target": "current",
                "type": "ir.actions.act_window",
            }
        return None

    def action_calculate_extent(self):
        """
        Calculates and sets the spatial extent (bounding box)
        of the collection using SQL and PostGIS.
        Updates the 'extent' field in GeoJSON format.
        """
        self.extent = self._calculate_extent_by_model()

    def action_build_schema(self):
        """Builds the JSON schema for the properties of this collection."""
        model = self.env[self.model_id.model]
        fields_info = model.fields_get(self.geo_view_fields_json or [])
        properties = {}
        required = []
        for field_name, field in fields_info.items():
            # Yardımcı fonksiyon ile tip dönüşümü
            properties[field_name] = self._field_type_to_json_type(field.get("type"))
            if field.get("required"):
                required.append(field_name)

        schema = {"type": "object", "required": required, "properties": properties}
        self.schema = json.dumps(schema, indent=2)

    def _field_type_to_json_type(self, field_type):
        """Odoo alan tipini JSON Schema tipine dönüştürür."""
        mapping = {
            "char": {"type": "string"},
            "text": {"type": "string"},
            "float": {"type": "number"},
            "monetary": {"type": "number"},
            "integer": {"type": "integer"},
            "boolean": {"type": "boolean"},
            "date": {"type": "string", "format": "date"},
            "datetime": {"type": "string", "format": "date-time"},
        }
        return mapping.get(field_type, {"type": "string"})

    # Methods for OGC API compliance

    def _get_geo_field_props(self):
        """
        Retrieves geometry field properties (geo_type, srid, dim)
        from the related model.
        :return: Dictionary with geometry properties or False if not found.
        """
        if self.model_id and self.geo_field_name:
            try:
                fields_info = self.env[self.model_id.model].fields_get(
                    [self.geo_field_name]
                )
                geo_info = fields_info.get(self.geo_field_name)
                if geo_info:
                    props = geo_info.get("geo_type")
                    return props
            except Exception as e:
                _logger.warning("Geometry properties could not be fetched: %s", e)
                return False
        return None

    def _get_geo_view_fields(self):
        """
        Retrieves the list of fields (except geometry) to be shown
        in the geoengine view for this collection.
        :return: List of field names or False.
        """
        fields_in_view = []
        if not self.model_id or not self.geo_field_name:
            return False
        # model = self.env[rec.model_id.model]
        geo_field = self.geo_field_name
        view = self.env["ir.ui.view"].search(
            [
                ("model", "=", self.model_id.model),
                ("type", "=", "geoengine"),
            ],
            limit=1,
        )
        if view and view.arch:
            root = ET.fromstring(view.arch)
            for field in root.findall("./field"):
                field_name = field.get("name")
                if field_name and field_name != geo_field:
                    fields_in_view.append(field_name)
        if not fields_in_view:
            return False
        return ",".join(fields_in_view)

    def get_collection(self):
        """
        Converts the collection to a dictionary representation.
        :return: Dictionary with collection data.
        """
        self.ensure_one()
        return {
            "id": self.name,
            "title": self.title,
            "description": self.description or "",
            "extent": self.extent_json if self.extent_json else [],
        }

    def get_feature_schema(self):
        """
        Returns the JSON schema for a single feature in this collection.
        :return: Dictionary representing the JSON schema for a feature.
        """
        self.ensure_one()
        return self._get_feature_schema()

    def get_items(self, pargs=None, qargs=None):
        """
        Returns a GeoJSON FeatureCollection of items in this collection,
        with optional filtering and pagination.
        """
        self.ensure_one()
        pargs = pargs or {}
        qargs = qargs or {}
        offset = qargs.get("offset", 0)
        limit = qargs.get("limit", 100)
        domain = []

        items = self.env[self.model_id.model].search(domain, offset=offset, limit=limit)
        result = self._get_feature_collection(items)
        return result

    def get_item(self, pargs=None, qargs=None):
        """
        Returns a GeoJSON Feature for a single item in this collection.
        """
        pargs = pargs or {}
        qargs = qargs or {}

        item = self.env[self.model_id.model].browse(int(pargs.get("featureId", 0)))
        if not item.exists():
            self.raise_not_found(_("Item not found in collection."))
        result = self._get_feature(item)
        return result

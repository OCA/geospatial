# -*- coding: utf-8 -*-
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

from odoo import _, api, fields, models
import logging
import json
import xml.etree.ElementTree as ET
import re
from collections import OrderedDict
from odoo.exceptions import ValidationError


_logger = logging.getLogger(__name__)

GEO_TYPES = [
    'geo_line', 'geo_point', 'geo_polygon',
    'geo_multi_line', 'geo_multi_point', 'geo_multi_polygon'
]
DEFAULT_CRS = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"

def parse_bbox_param(bbox):
    if not bbox:
        return None
    if isinstance(bbox, str):
        parts = bbox.split(',')
        if len(parts) not in (4, 6):
            return None
        try:
            coords = [float(x) for x in parts]
        except ValueError:
            return None
        return coords
    elif isinstance(bbox, (list, tuple)):
        if len(bbox) not in (4, 6):
            return None
        try:
            coords = [float(x) for x in bbox]
        except Exception:
            return None
        return coords
    return None

class OgcapiCollection(models.Model):
    _name = "ogcapi.collection"
    _description = "OGC API Collections"
    _inherit = ['ogcapi.openapi.mixin']
    _sql_constraints = [
        (
            'unique_name_api_id',
            'unique(name, api_id)',
            'The combination of Name and Related API must be unique!'
        ),
    ]
    
    name = fields.Char(string="Name", required=True)
    title = fields.Char(string="Title", required=True)
    description = fields.Char(string="Description")
    
    # relation fields
    api_id = fields.Many2one('ogcapi.api', string="Related API", required=True)
    model_id = fields.Many2one(
        'ir.model', 
        string="Related Model", 
        ondelete='set null',
        domain=lambda self: self._geoengine_model_domain()
    )
    geo_field_id = fields.Many2one(
        'ir.model.fields',
        string='Geometry Field',
        domain="[('model_id', '=', model_id), ('ttype', 'in', ['geo_point','geo_line','geo_polygon','geo_multi_point','geo_multi_line','geo_multi_polygon'])]",
        help="Select the geometry field for this collection."
    )
    geo_field_name = fields.Char(
        string='Geometry Field Name',
        help="Select the geometry field for this collection.",
    )

    geo_type = fields.Selection(
        selection=[
            ('Point', 'Point'),
            ('LineString', 'LineString'),
            ('Polygon', 'Polygon'),
            ('MultiPoint', 'MultiPoint'),
            ('MultiLineString', 'MultiLineString'),
            ('MultiPolygon', 'MultiPolygon'),
        ],
        string="Geometry Type",
        help="Type of the geometry field (e.g., Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon)"
    )
    geo_srid = fields.Integer(
        string="Storage SRID",
        help="Spatial Reference Identifier (SRID) for the storage of geometries."
    )
    geo_dimension = fields.Integer(
        string="Geometry Dimension",
        help="Dimension of the geometry field (2 for 2D, 3 for 3D geometries)"
    )
    geo_view_fields = fields.Text(
        string="Geoengine View Fields",
    )
    max_features = fields.Integer(
        string="Max Features",
        default=1000,
        help="Maximum number of features that can be retrieved from this collection."
    )
    crs_ids = fields.Many2many('ogcapi.crs', string="Available CRSs",
        help="Available Coordinate Reference Systems (CRS) for this collection. "
             "If empty, only CRS84 is available.")
    crs_default = fields.Many2one('ogcapi.crs', string="Default CRS",
        help="Default Coordinate Reference System (CRS) for this collection. "
             "If empty, CRS84 is used as default.")
    keywords = fields.Many2many('ogcapi.keyword', string="Keywords")
    extent = fields.Char(string="Extent", help="Spatial extent of the collection in GeoJSON format [minX, minY, maxX, maxY] with EPSG:4326 (longitude, latitude)")


    @api.constrains('geo_srid')
    def _check_geo_srid(self):
        """
        Constraint to ensure that the provided SRID exists in the PostGIS spatial_ref_sys table.
        Raises a ValidationError if the SRID is not found.
        """
        for rec in self:
            if rec.geo_srid:
                self.env.cr.execute("""
                    SELECT srid FROM spatial_ref_sys WHERE srid = %s
                """, (rec.geo_srid,))
                result = self.env.cr.fetchone()
                if not result:
                    raise ValidationError(_("SRID %s is not defined in PostGIS spatial_ref_sys table!") % rec.geo_srid)

    @api.onchange('model_id')
    def _onchange_model_id(self):
        """
        Onchange handler for model_id.
        Sets default values for name, title, and description based on the selected model.
        Resets geometry-related fields.
        """
        if self.model_id:
            if not self.name:
                self.name = self.model_id.model.split('.')[-1]
            if not self.title:
                self.title = self.model_id.name
            if not self.description:
                self.description = self.model_id.name
        self.geo_field_id = False
        self.geo_view_fields = False
        self.geo_type = False
        self.geo_srid = False
        self.geo_dimension = False

    @api.onchange('geo_field_id')
    def _onchange_geo_field_id(self):
        """
        Onchange handler for geo_field_id.
        Sets geometry field name and updates geometry properties (type, SRID, dimension).
        """
        self.geo_field_name = self.geo_field_id.name if self.geo_field_id else False
        geo_props = self._get_geo_field_props()
        if geo_props:
            self.geo_view_fields = json.dumps(self._get_geo_view_fields())
            self.geo_type = geo_props.get('geo_type') or False
            self.geo_srid = int(geo_props.get('srid')) or False
            self.geo_dimension = geo_props.get('dim') or False

    @api.model
    def _geoengine_model_domain(self):
        """
        Returns a domain for ir.model to filter only models with a geoengine view.
        :return: List of tuples representing the domain.
        """
        geoengine_views = self.env['ir.ui.view'].search([('type', '=', 'geoengine')])
        model_names = geoengine_views.mapped('model')
        model_ids = self.env['ir.model'].search([('model', 'in', model_names)]).ids
        return [('id', 'in', model_ids)]

    def action_api_collection_items(self):
        """
        Returns an action to open the items of the related model in a tree, form, or geoengine view.
        :return: Dictionary representing the Odoo action.
        """
        if self.model_id:
            return {
                'name':_('Items'),
                'res_model' : self.model_id.model,
                'view_mode' : 'tree,form,geoengine',
                'context'   : {},
                'domain'    : [],
                'target'    : 'current',
                'type'      : 'ir.actions.act_window', 
            }

    def action_calculate_extent(self):
        """
        Calculates and sets the spatial extent (bounding box) of the collection using SQL and PostGIS.
        Updates the 'extent' field in GeoJSON format.
        """
        if not self.model_id or not self.geo_field_name or not self.geo_srid:
            self.extent = False
            return

        table_name = self.env[self.model_id.model]._table
        geo_field = self.geo_field_name
        srid = self.geo_srid

        # SQL ile extent hesapla
        if srid != 4326:
            sql = f"""
                SELECT ARRAY[
                    ROUND(ST_XMin(ext)::numeric, 6),
                    ROUND(ST_YMin(ext)::numeric, 6),
                    ROUND(ST_XMax(ext)::numeric, 6),
                    ROUND(ST_YMax(ext)::numeric, 6)
                ] AS bbox
                FROM (
                    SELECT ST_Extent(ST_Transform("{geo_field}", 4326)) AS ext FROM "{table_name}"
                    WHERE "{geo_field}" IS NOT NULL
                ) AS sub
            """
        else:
            sql = f"""
                SELECT ARRAY[
                    ROUND(ST_XMin(ext)::numeric, 6),
                    ROUND(ST_YMin(ext)::numeric, 6),
                    ROUND(ST_XMax(ext)::numeric, 6),
                    ROUND(ST_YMax(ext)::numeric, 6)
                ] AS bbox
                FROM (
                    SELECT ST_Extent("{geo_field}") AS ext FROM "{table_name}"
                    WHERE "{geo_field}" IS NOT NULL
                ) AS sub
            """
        self.env.cr.execute(sql)
        result = self.env.cr.fetchone()
        bbox = result[0] 
        if not bbox:
            self.extent = False
            return
        self.extent = json.dumps([float(x) for x in bbox])
 
    def _get_geo_field_props(self):
        """
        Retrieves geometry field properties (geo_type, srid, dim) from the related model.
        :return: Dictionary with geometry properties or False if not found.
        """
        if self.model_id and self.geo_field_name:
            try:
                fields_info = self.env[self.model_id.model].fields_get([self.geo_field_name])
                geo_info = fields_info.get(self.geo_field_name)
                if geo_info:
                    props = geo_info.get("geo_type")
                    return props
            except Exception as e:
                _logger.warning("Geometry properties could not be fetched: %s", e)
                return False

    def _get_geo_view_fields(self):
        """
        Retrieves the list of fields (except geometry) to be shown in the geoengine view for this collection.
        :return: List of field names or False.
        """
        fields_in_view = []
        if not self.model_id or not self.geo_field_name:
            return False
        # model = self.env[rec.model_id.model]
        geo_field = self.geo_field_name
        view = self.env['ir.ui.view'].search([
            ('model', '=', self.model_id.model),
            ('type', '=', 'geoengine')
        ], limit=1)
        if view and view.arch:
            root = ET.fromstring(view.arch)
            for field in root.findall('./field'):
                field_name = field.get('name')
                if field_name and field_name != geo_field:
                    fields_in_view.append(field_name)
        if not fields_in_view:
            return False
        else:
            return fields_in_view

    def _get_crs_uri(self, srid):
        """
        Returns the CRS URI for a given SRID.
        :param int srid: Spatial Reference Identifier.
        :return: CRS URI string.
        """
        if srid == 4326:
            return DEFAULT_CRS
        return f"http://www.opengis.net/def/crs/EPSG/0/{srid}"

    def _get_available_crs_list(self):
        """
        Returns the list of available CRS URIs for this collection.
        :return: List of CRS URI strings.
        """
        self.ensure_one()
        crs_list = []
        if self.crs_default:
            crs_list.append(self.crs_default.crs_uri)
        crs_list.append(DEFAULT_CRS)

        if self.crs_ids:
            for crs in self.crs_ids:
                if crs.crs_uri not in crs_list:
                    crs_list.append(crs.crs_uri)
        return crs_list

    def _get_srid_from_crs(self, crs_uri):
        """
        Extracts the SRID integer from a CRS URI.
        :param str crs_uri: CRS URI string.
        :return: SRID as integer.
        """
        match = re.search(r'/(\d+)$', crs_uri)
        if match:
            return int(match.group(1))
        return 4326

    def _get_geojson_geometry(self, rec_id, req_srid=4326):
        """
        Retrieves the geometry of a record as GeoJSON, optionally transforming to the requested SRID.
        :param int rec_id: Record ID.
        :param int req_srid: Requested SRID (default 4326).
        :return: Geometry as a GeoJSON dict or None.
        """
        geometry=None
        if rec_id and isinstance(rec_id, int) and self.geo_field_name:
            storage_srid = self.geo_srid or 4326
            geo_field = self.geo_field_name 
            precision = 6  if req_srid == 4326 else 2 # GeoJSON için genellikle 6 basamak yeterli
            model_name = self.model_id.model
            table_name = self.env[model_name]._table
            if req_srid != storage_srid:
                sql = f"""
                    SELECT ST_AsGeoJSON(ST_Transform({geo_field}, {req_srid}), {precision}) FROM {table_name} WHERE id = {rec_id}
                """
            else:
                sql = f"""
                    SELECT ST_AsGeoJSON({geo_field}, {precision}) FROM {table_name} WHERE id = {rec_id}
                """
            self.env.cr.execute(sql)
            geojson_str = self.env.cr.fetchone()[0]
            geometry = json.loads(geojson_str)
        return geometry
    
    def _get_geojson_feature(self, record, req_srid=4326, skip_geometry=False):
        """
        Builds a GeoJSON Feature for the given record.
        :param record: Odoo record.
        :param int req_srid: Requested SRID (default 4326).
        :param bool skip_geometry: If True, geometry will not be included.
        :return: GeoJSON Feature dict or None.
        """
        if not record:
            return None
        geometry=None

        properties = {}
        try:
            view_fields = json.loads(self.geo_view_fields) if self.geo_view_fields else []
        except Exception as e:
            _logger.warning("geo_view_fields could not be parsed: %s", e)
            view_fields = []
        for field in view_fields:
            properties[field] = getattr(record, field, None)
        if not skip_geometry and self.geo_field_name:
            geometry = self._get_geojson_geometry(
                rec_id=record.id, 
                req_srid=req_srid
            )

        feature = {
            "type": "Feature",
            "id": record.id,
            "properties": properties,
            "geometry": geometry
        }
        
        return feature


    def _get_feature_fields(self):
        """
        Returns the field definitions for the fields shown in the geoengine view.
        :return: OrderedDict of field definitions.
        """
        model = self.env[self.model_id.model]
        try:
            fields_in_view = json.loads(self.geo_view_fields) if self.geo_view_fields else []
        except Exception as e:
            _logger.warning("geo_view_fields could not be parsed: %s", e)
            fields_in_view = []

        fields_info = model.fields_get()
        result = OrderedDict()
        for field_name in fields_in_view:
            if field_name in fields_info:
                result[field_name] = fields_info[field_name]
        return result

    def get_collection_schema(self):
        """
        Returns the JSON schema for the features of this collection.
        :return: Dictionary representing the JSON schema.
        """
        self.ensure_one()
        static_schemas= self._get_static_schemas()
        feature_schema = self._get_base_feature_schema()
        feature_schema['$schema'] = "http://json-schema.org/draft/2020-12/schema#"
        feature_schema['title'] = _("Feature schema for  %s") % self.title
        feature_schema['properties']['properties'] = self._get_feature_props_schema()
        geometry_type = self.geo_type or 'Geometry'
        feature_schema['properties']['geometry'] = static_schemas.get(geometry_type, static_schemas['Geometry'])
        return feature_schema

    def get_collection(self):
        """
        Returns the metadata for this collection, including links and extent.
        :return: Dictionary with collection metadata.
        """
        self.ensure_one()
        base_url = self.api_id.get_base_url()
        collection_id = self.name
        extent = None
        if self.extent:
            try:
                bbox = json.loads(self.extent)
                extent = {
                    "spatial": {
                        "bbox": [bbox],
                        "crs": DEFAULT_CRS
                    }
                }
            except Exception:
                extent = None

        result = {
            "id": self.name,
            "title": self.title,
            "description": self.description or "",
            "extent": extent,
            'crs': self.get_collection_crs(),
            "storageCrs": self._get_crs_uri(self.geo_srid) if self.geo_srid else self._get_available_crs_list()[0],
            "links": [
                {
                    "href": f"{base_url}/ogcapi/{self.api_id.name}/collections/{collection_id}",
                    "rel": "self",
                    "type": "application/json",
                    "title": f"Metadata for {self.title}"
                },
                {
                    "href": f"{base_url}/ogcapi/{self.api_id.name}/collections/{collection_id}/items",
                    "rel": "items",
                    "type": "application/geo+json",
                    "title": f"Features of {self.title}"
                },
                {
                    "href": f"{base_url}/ogcapi/{self.api_id.name}/collections/{collection_id}/schema",
                    "rel": "schema",
                    "type": "application/json",
                    "title": f"Schema of {self.title}"
                }
            ]
        }
        if self.keywords:
            result["keywords"] = [kw.name for kw in self.keywords]
        return result

    def get_collection_crs(self):
        """
        Returns the available CRS URIs for this collection.
        :return: Dictionary with 'crs' key and list of CRS URIs.
        """
        self.ensure_one()
        return {'crs': self._get_available_crs_list()}

    def get_items(self, offset=0, limit=None, crs=None, bbox=None, bbox_crs=None, bbox_crs_epsg=None, skip_geometry=False):
        """
        Returns a GeoJSON FeatureCollection of items in this collection, with optional filtering and pagination.
        :param int offset: Offset for pagination.
        :param int limit: Maximum number of features to return.
        :param str crs: CRS URI to use for output.
        :param str bbox: Bounding box filter.
        :param str bbox_crs: CRS URI for bbox.
        :param str bbox_crs_epsg: EPSG code for bbox.
        :param bool skip_geometry: If True, geometry will not be included.
        :return: Dictionary representing a GeoJSON FeatureCollection.
        """
        self.ensure_one()
        base_url = self.api_id.get_base_url()
        collection_id = self.name
        if not isinstance(offset, int):
            try:
                offset = int(offset)
            except (ValueError, TypeError):
                offset = 0
        limit_default = self.max_features or 1000
        if not isinstance(limit, (int, type(None))):
            try:
                limit = int(limit)
                if limit <= 0 or limit > limit_default:
                    limit = limit_default
            except (ValueError, TypeError):
                limit = limit_default
        if crs:
            if not isinstance(crs, str) or crs not in self._get_available_crs_list():
                _logger.warning("Invalid CRS type or value: %s", crs)
                return {
                    "error": {
                        "code": 400,
                        "message": _("Invalid CRS type or value: %s") % crs
                    }
                }
        else:
            crs = self._get_available_crs_list()[0]


        domain = []
        if bbox:
            bbox_vals = parse_bbox_param(bbox)
            if not bbox_vals:
                return {
                    "error": {
                        "code": 400,
                        "message": _("Invalid bbox parameter.")
                    }
                }
            if bbox_crs and bbox_crs in self._get_available_crs_list():
                try:
                    req_srid = int(bbox_crs.rstrip('/').split('/')[-1])
                except ValueError:
                    req_srid = 4326
            elif bbox_crs_epsg:
                try:
                    req_srid = int(bbox_crs_epsg)
                except ValueError:
                    req_srid = 4326
            else:
                req_srid = 4326
            storage_srid = self.geo_srid or 4326
            precision = 6 if req_srid == 4326 else 2
            if req_srid != storage_srid:
                sql = f"""
                    SELECT ST_AsText(ST_Transform(ST_MakeEnvelope({bbox_vals[0]}, {bbox_vals[1]}, {bbox_vals[2]}, {bbox_vals[3]}, {req_srid}), {storage_srid}), {precision});
                """
            else:
                sql = f"""
                    SELECT ST_AsText(ST_MakeEnvelope({bbox_vals[0]}, {bbox_vals[1]}, {bbox_vals[2]}, {bbox_vals[3]}, {req_srid}),{precision});
                """
            self.env.cr.execute(sql)
            polygon_wkt = self.env.cr.fetchone()[0]
            if not polygon_wkt:
                _logger.warning("Invalid bbox or CRS: %s, %s", bbox, crs)
                return {
                    "error": {
                        "code": 400,
                        "message": _("Invalid bbox or CRS: %s, %s") % (bbox, crs)
                    }
                }
            _logger.info("Polygon WKT: %s", polygon_wkt)
            domain.append((self.geo_field_name, 'geo_intersect', polygon_wkt))

        features = []
        records = self.env[self.model_id.model].search(domain, offset=offset, limit=limit)
        if not records:
            number_matched = 0
            number_returned = 0
        else:
            number_matched = self.env[self.model_id.model].search_count(domain)
            number_returned = len(records)
            for record in records:
                feature = self.get_item(
                    feature_id=record.id, 
                    crs=crs, 
                    skip_geometry=skip_geometry
                )
                features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": crs
                }
            },
            "timestamp": fields.Datetime.now(),
            "numberMatched": number_matched,
            "numberReturned": number_returned,
            "links": [
                {
                    "rel": "self",
                    "href": f"{base_url}/ogcapi/{self.api_id.name}/collections/{collection_id}/items",
                    "type": "application/geo+json"
                },
                {
                    "rel": "collection",
                    "href": f"{base_url}/ogcapi/{self.api_id.name}/collections/{collection_id}",
                    "type": "application/json",
                    "title": f"Metadata for {self.title}"
                }
            ],
            "features": features,

        }

    def get_item(self, feature_id, crs=None, skip_geometry=False):
        """
        Returns a GeoJSON Feature for a single item (feature) in this collection.
        :param int feature_id: ID of the feature.
        :param str crs: CRS URI to use for output.
        :param bool skip_geometry: If True, geometry will not be included.
        :return: GeoJSON Feature dict or None.
        """
        self.ensure_one()
        base_url = self.api_id.get_base_url()
        if crs:
            if not isinstance(crs, str) or crs not in self._get_available_crs_list():
                _logger.warning("Invalid CRS type or value: %s", crs)
                return {
                    "error": {
                        "code": 400,
                        "message": _("Invalid CRS type or value: %s") % crs
                    }
                }
        else:
            crs = self._get_available_crs_list()[0]
        try:
            fid = int(feature_id)
        except (ValueError, TypeError):
            _logger.warning("Invalid feature_id: %s", feature_id)
            return None
        record = self.env[self.model_id.model].browse(fid)
        if not record.exists():
            return None

        feature = self._get_geojson_feature(
            record=record, 
            req_srid=self._get_srid_from_crs(crs) if crs else 4326, 
            skip_geometry=skip_geometry
        )
        
        feature['links'] = [
                {
                    "href": f"{base_url}/ogcapi/{self.api_id.name}/collections/{self.name}/items/{record['id']}",
                    "rel": "self",
                    "type": "application/geo+json",
                    "title": "This feature"
                }
            ]
        return feature
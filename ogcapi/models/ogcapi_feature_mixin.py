import json
import logging

from psycopg2 import sql

from odoo import models

_logger = logging.getLogger(__name__)


class OgcapiFeatureMixin(models.AbstractModel):
    _name = "ogcapi.feature.mixin"
    _description = "OGC API Feature Mixin"

    def _calculate_extent_by_model(self):
        """
        Calculates the extent of a model's geometries.
        :param model: Odoo model to calculate extent for.
        :param geo_field: Name of the geometry field.
        :param srid: SRID of the geometries.
        """
        if not self.model_id or not self.geo_field_name or not self.geo_srid:
            return False
        model = self.env[self.model_id.model]
        geo_field = self.geo_field_name
        srid = self.geo_srid

        if srid != 4326:
            query = sql.SQL(
                """
                SELECT ARRAY[
                    ROUND(ST_XMin(ext)::numeric, 6),
                    ROUND(ST_YMin(ext)::numeric, 6),
                    ROUND(ST_XMax(ext)::numeric, 6),
                    ROUND(ST_YMax(ext)::numeric, 6)
                ] AS bbox
                FROM (
                    SELECT ST_Extent(ST_Transform({}, 4326)) AS ext FROM {}
                    WHERE {} IS NOT NULL
                ) AS sub
            """
            ).format(
                sql.Identifier(geo_field),
                sql.Identifier(model._table),
                sql.Identifier(geo_field),
            )
        else:
            query = sql.SQL(
                """
                SELECT ARRAY[
                    ROUND(ST_XMin(ext)::numeric, 6),
                    ROUND(ST_YMin(ext)::numeric, 6),
                    ROUND(ST_XMax(ext)::numeric, 6),
                    ROUND(ST_YMax(ext)::numeric, 6)
                ] AS bbox
                FROM (
                    SELECT ST_Extent({}) AS ext FROM {}
                    WHERE {} IS NOT NULL
                ) AS sub
            """
            ).format(
                sql.Identifier(geo_field),
                sql.Identifier(model._table),
                sql.Identifier(geo_field),
            )

        self.env.cr.execute(query)
        extent = self.env.cr.fetchone()[0]
        if extent and len(extent) == 4:
            try:
                return ",".join(str(float(x)) for x in extent if x is not None)
            except (TypeError, ValueError) as e:
                _logger.warning(
                    "Extent float conversion error for model %s: %s", model._name, e
                )
                return False
        return False

    def _get_feature_properties(self, item):
        """
        Retrieves the properties of a record as a dictionary.
        :param item: Record to retrieve properties from.
        :return: Dictionary of properties.
        """
        if not item.exists() or not self.geo_view_fields:
            return {}

        view_fields = self.geo_view_fields_json if self.geo_view_fields_json else []

        properties = {}
        for field in view_fields:
            field_value = getattr(item, field, None)
            properties[field] = field_value
        return properties

    def _get_geojson_geometry(self, item, req_srid=4326):
        """
        Retrieves the geometry of a record as GeoJSON,
        optionally transforming to the requested SRID.
        :param int rec_id: Record ID.
        :param int req_srid: Requested SRID (default 4326).
        :return: Geometry as a GeoJSON dict or None.
        """

        geometry = None
        if item.exists() and item.id and self.geo_field_name:
            try:
                storage_srid = self.geo_srid or 4326
                geo_field = self.geo_field_name
                precision = (
                    6 if req_srid == 4326 else 2
                )  # GeoJSON için genellikle 6 basamak yeterli
                model_name = self.model_id.model
                table_name = self.env[model_name]._table
                if req_srid != storage_srid:
                    query = sql.SQL(
                        """
                        SELECT ST_AsGeoJSON(ST_Transform({}, {}), {})
                        FROM {} WHERE id = {}
                    """
                    ).format(
                        sql.Identifier(geo_field),
                        sql.Literal(req_srid),
                        sql.Literal(precision),
                        sql.Identifier(table_name),
                        sql.Literal(item.id),
                    )
                    self.env.cr.execute(query)
                else:
                    query = sql.SQL(
                        """
                        SELECT ST_AsGeoJSON({}, {}) FROM {} WHERE id = {}
                    """
                    ).format(
                        sql.Identifier(geo_field),
                        sql.Literal(precision),
                        sql.Identifier(table_name),
                        sql.Literal(item.id),
                    )
                    self.env.cr.execute(query)
                geojson_str = self.env.cr.fetchone()[0]
                geometry = json.loads(geojson_str)
            except Exception as e:
                _logger.error("Error retrieving geometry for item %s: %s", item.id, e)
                return None
        return geometry

    def _get_feature_schema(self):
        # Implement the logic to get feature schema
        default_schema = {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "type": {"type": "string", "enum": ["Feature"]},
            },
            "required": ["id", "type", "geometry", "properties"],
        }
        properties = {}
        try:
            properties = json.loads(self.schema) if self.schema else {}
            if not isinstance(properties, dict):
                properties = {}
        except json.JSONDecodeError:
            properties = {}

        geometry = {}
        geo_schema = self.env["ogcapi.component.schema"].search(
            [("code", "=", self.geo_type or "Point")], limit=1
        )
        if (
            geo_schema.exists()
            and geo_schema.schema_json
            and isinstance(geo_schema.schema_json, dict)
        ):
            geometry = geo_schema.schema_json

        default_schema["properties"]["geometry"] = geometry
        default_schema["properties"]["properties"] = properties
        return default_schema

    def _get_feature_collection(self, items=None):
        # Implement the logic to get feature collection
        items = items or []
        features = []
        for item in items:
            features.append(self._get_feature(item))
        return {
            "type": "FeatureCollection",
            "features": features,
            "links": [],
        }

    def _get_feature(self, item):
        feature = {
            "type": "Feature",
            "id": item.id,
            "properties": self._get_feature_properties(item),
            "geometry": self._get_geojson_geometry(item),
        }
        return feature

    def _parse_bbox_param(self, bbox):
        """Parse the bbox parameter from a string or list/tuple."""
        if not bbox:
            return None
        if isinstance(bbox, str):
            parts = bbox.split(",")
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
            except ValueError:
                return None
            return coords
        return None

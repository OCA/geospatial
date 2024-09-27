# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import json
import logging
from operator import attrgetter

from odoo import _, fields
from odoo.tools import sql

from . import geo_convertion_helper as convert
from .geo_db import create_geo_column, create_geo_index

logger = logging.getLogger(__name__)
try:
    import geojson
    from shapely.geometry import Point, shape
    from shapely.geometry.base import BaseGeometry
    from shapely.wkb import loads as wkbloads
except ImportError:
    logger.warning("Shapely or geojson are not available in the sys path")


class GeoField(fields.Field):
    """The field descriptor contains the field definition common to all
    specialized fields for geolocalization. Subclasses must define a type
    and a geo_type. The type is the name of the corresponding column type,
    the geo_type is the name of the corresponding type in the GIS system.
    """

    geo_type = None
    dim = "2"
    srid = 3857
    gist_index = True

    @property
    def column_type(self):
        postgis_geom_type = self.geo_type.upper() if self.geo_type else "GEOMETRY"
        if self.dim == "3":
            postgis_geom_type += "Z"
        elif self.dim == "4":
            postgis_geom_type += "ZM"
        return ("geometry", f"geometry({postgis_geom_type}, {self.srid})")

    def convert_to_column(self, value, record, values=None):
        """Convert value to database format

        value can be geojson, wkt, shapely geometry object.
        If geo_direct_write in context you can pass diretly WKT"""
        if not value:
            return None
        shape_to_write = self.entry_to_shape(value, same_type=True)
        if shape_to_write.is_empty:
            return None
        else:
            return f"SRID={self.srid};{shape_to_write.wkt}"

    def convert_to_cache(self, value, record, validate=True):
        val = value
        if isinstance(val, bytes | str):
            try:
                int(val, 16)
            except Exception:
                # not an hex value -> try to load from a sting
                # representation of a geometry
                value = convert.value_to_shape(value, use_wkb=False)
        if isinstance(value, BaseGeometry):
            val = value.wkb_hex
        return val

    def convert_to_record(self, value, record):
        """Value may be:
        - a GeoJSON string when field onchange is triggered
        - a geometry object hexcode from cache
        - a unicode containing dict
        """
        if not value:
            return False
        return convert.value_to_shape(value, use_wkb=True)

    def convert_to_read(self, value, record, use_name_get=True):
        if not isinstance(value, BaseGeometry):
            # read hexadecimal value from database
            shape = self.load_geo(value)
        else:
            shape = value
        if not shape or shape.is_empty:
            return False
        return geojson.dumps(shape)

    #
    # Field description
    #

    # properties used by get_description()
    _description_dim = property(attrgetter("dim"))
    _description_srid = property(attrgetter("srid"))
    _description_gist_index = property(attrgetter("gist_index"))

    @classmethod
    def load_geo(cls, wkb):
        """Load geometry into browse record after read was done"""
        if isinstance(wkb, BaseGeometry):
            return wkb
        return wkbloads(wkb, hex=True) if wkb else False

    def entry_to_shape(self, value, same_type=False):
        """Transform input into an object"""
        shape = convert.value_to_shape(value)
        if same_type and not shape.is_empty:
            if shape.geom_type.lower() != self.geo_type.lower():
                msg = _(
                    "Geo Value %(geom_type)s must be of the same type %(geo_type)s \
                        as fields",
                    geom_type=shape.geom_type.lower(),
                    geo_type=self.geo_type.lower(),
                )
                raise TypeError(msg)
        return shape

    def update_geo_db_column(self, model):
        """Update the column type in the database."""
        cr = model._cr
        query = """SELECT srid, type, coord_dimension
                 FROM geometry_columns
                 WHERE f_table_name = %s
                 AND f_geometry_column = %s"""
        cr.execute(query, (model._table, self.name))
        check_data = cr.fetchone()
        if not check_data:
            raise TypeError(
                _(
                    "geometry_columns table seems to be corrupted."
                    " SRID check is not possible"
                )
            )
        if check_data[0] != self.srid:
            raise TypeError(
                _(
                    "Reprojection of column is not implemented."
                    " We can not change srid %(srid)s to %(data)s",
                    srid=self.srid,
                    data=check_data[0],
                )
            )
        elif check_data[1] != self.geo_type.upper():
            raise TypeError(
                _(
                    "Geo type modification is not implemented."
                    " We can not change type %(data)s to %(geo_type)s",
                    data=check_data[1],
                    geo_type=self.geo_type.upper(),
                )
            )
        elif check_data[2] != self.dim:
            raise TypeError(
                _(
                    "Geo dimention modification is not implemented."
                    " We can not change dimention %(data)s to %(dim)s",
                    data=check_data[2],
                    dim=self.dim,
                )
            )
        if self.gist_index:
            create_geo_index(cr, self.name, model._table)
        return True

    def update_db_column(self, model, column):
        """Create/update the column corresponding to ``self``.

        For creation of geo column

        :param model: an instance of the field's model
        :param column: the column's configuration (dict)
                       if it exists, or ``None``
        """
        # the column does not exist, create it

        if not column:
            create_geo_column(
                model._cr,
                model._table,
                self.name,
                self.geo_type.upper(),
                self.srid,
                self.dim,
                self.string,
            )
            if self.gist_index:
                create_geo_index(model._cr, self.name, model._table)
            return

        if column["udt_name"] == self.column_type[0]:
            if self.gist_index:
                create_geo_index(model._cr, self.name, model._table)
            return

        self.update_geo_db_column(model)

        if column["udt_name"] in self.column_cast_from:
            sql.convert_column(model._cr, model._table, self.name, self.column_type[1])
        else:
            newname = (self.name + "_moved{}").format
            i = 0
            while sql.column_exists(model._cr, model._table, newname(i)):
                i += 1
            if column["is_nullable"] == "NO":
                sql.drop_not_null(model._cr, model._table, self.name)
            sql.rename_column(model._cr, model._table, self.name, newname(i))
            sql.create_column(
                model._cr, model._table, self.name, self.column_type[1], self.string
            )


class GeoLine(GeoField):
    """Field for POSTGIS geometry Line type"""

    type = "geo_line"
    geo_type = "LineString"

    @classmethod
    def from_points(cls, cr, point1, point2, srid=None):
        """
        Converts given points in parameter to a line.
        :param cr: DB cursor
        :param point1: Point (BaseGeometry)
        :param point2: Point (BaseGeometry)
        :param srid: SRID
        :return: LINESTRING Object
        """
        sql = """
        SELECT
            ST_MakeLine(
                ST_GeomFromText(%(wkt1)s, %(srid)s),
                ST_GeomFromText(%(wkt2)s, %(srid)s)
            )
        """
        cr.execute(
            sql,
            {
                "wkt1": point1.wkt,
                "wkt2": point2.wkt,
                "srid": srid or cls.srid,
            },
        )
        res = cr.fetchone()
        return cls.load_geo(res[0])


class GeoPoint(GeoField):
    """Field for POSTGIS geometry Point type"""

    type = "geo_point"
    geo_type = "Point"

    @classmethod
    def from_latlon(cls, cr, latitude, longitude):
        """Convert a (latitude, longitude) into an UTM coordinate Point:"""
        pt = Point(longitude, latitude)
        cr.execute(
            """
            SELECT
                ST_Transform(
                    ST_GeomFromText(%(wkt)s, 4326),
                    %(srid)s)
        """,
            {"wkt": pt.wkt, "srid": cls.srid},
        )
        res = cr.fetchone()
        return cls.load_geo(res[0])

    @classmethod
    def to_latlon(cls, cr, geopoint):
        """Convert a UTM coordinate point to \
            (latitude, longitude):"""
        # Line to execute to retrieve
        # longitude, latitude from UTM in postgres command line:
        #  SELECT ST_X(geom), ST_Y(geom) FROM (SELECT ST_TRANSFORM(ST_SetSRID(
        #               ST_MakePoint(601179.61612, 6399375,681364),
        # ..............900913), 4326) as geom) g;
        if isinstance(geopoint, BaseGeometry):
            geo_point_instance = geopoint
        else:
            geo_point_instance = shape(json.loads(geopoint))
        cr.execute(
            """
                    SELECT
                        ST_TRANSFORM(
                            ST_SetSRID(
                                ST_MakePoint(
                                        %(coord_x)s, %(coord_y)s
                                            ),
                                        %(srid)s
                                      ), 4326)""",
            {
                "coord_x": geo_point_instance.x,
                "coord_y": geo_point_instance.y,
                "srid": cls.srid,
            },
        )

        res = cr.fetchone()
        point_latlon = cls.load_geo(res[0])
        return point_latlon.x, point_latlon.y


class GeoPolygon(GeoField):
    """Field for POSTGIS geometry Polygon type"""

    type = "geo_polygon"
    geo_type = "Polygon"


class GeoMultiLine(GeoField):
    """Field for POSTGIS geometry MultiLine type"""

    type = "geo_multi_line"
    geo_type = "MultiLineString"


class GeoMultiPoint(GeoField):
    """Field for POSTGIS geometry MultiPoint type"""

    type = "geo_multi_point"
    geo_type = "MultiPoint"


class GeoMultiPolygon(GeoField):
    """Field for POSTGIS geometry MultiPolygon type"""

    type = "geo_multi_polygon"
    geo_type = "MultiPolygon"


fields.GeoLine = GeoLine
fields.GeoPoint = GeoPoint
fields.GeoPolygon = GeoPolygon
fields.GeoMultiLine = GeoMultiLine
fields.GeoMultiPoint = GeoMultiPoint
fields.GeoMultiPolygon = GeoMultiPolygon

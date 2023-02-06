# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import logging
from operator import attrgetter

from odoo import _, fields
from odoo.tools import sql

from .geo_db import create_geo_column
from .geo_helper import geo_convertion_helper as convert

logger = logging.getLogger(__name__)
try:
    import geojson
    from shapely.geometry import Point
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
    srid = 3857
    dim = 2
    gist_index = True

    @property
    def column_format(self):
        return "ST_GeomFromText(%s, {})".format(self.srid)

    @property
    def column_type(self):
        return ("geometry", "geometry")

    _slots = {"dim": 2, "srid": 3857, "gist_index": True}

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
            return shape_to_write.wkt

    def convert_to_cache(self, value, record, validate=True):
        val = value
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
        return wkbloads(wkb, hex=True) if wkb else False

    def entry_to_shape(self, value, same_type=False):
        """Transform input into an object"""
        shape = convert.value_to_shape(value)
        if same_type and not shape.is_empty:
            if shape.geom_type.lower() != self.geo_type.lower():
                msg = _("Geo Value %s must be of the same type %s as fields")
                raise TypeError(msg % (shape.geom_type.lower(), self.geo_type.lower()))
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
                "geometry_columns table seems to be corrupted."
                " SRID check is not possible"
            )
        if check_data[0] != self.srid:
            raise TypeError(
                "Reprojection of column is not implemented."
                " We can not change srid %s to %s" % (self.srid, check_data[0])
            )
        elif check_data[1] != self.geo_type:
            raise TypeError(
                "Geo type modification is not implemented."
                " We can not change type %s to %s" % (check_data[1], self.geo_type)
            )
        elif check_data[2] != self.dim:
            raise TypeError(
                "Geo dimention modification is not implemented."
                " We can not change dimention %s to %s" % (check_data[2], self.dim)
            )
        if self.gist_index:
            cr.execute(
                "SELECT indexname FROM pg_indexes WHERE indexname = %s",
                (self._postgis_index_name(model._table, self.name),),
            )
            index = cr.fetchone()
            if index:
                return True
            self._create_index(cr, model._table, self.name)
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
                self.geo_type,
                self.srid,
                self.dim,
                self.string,
            )
            return

        if column["udt_name"] == self.column_type[0]:
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
    geo_type = "LINESTRING"

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
                "srid": srid or cls._slots["srid"],
            },
        )
        res = cr.fetchone()
        return cls.load_geo(res[0])


class GeoPoint(GeoField):
    """Field for POSTGIS geometry Point type"""

    type = "geo_point"
    geo_type = "POINT"

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
            {"wkt": pt.wkt, "srid": cls._slots["srid"]},
        )
        res = cr.fetchone()
        return cls.load_geo(res[0])


class GeoPolygon(GeoField):
    """Field for POSTGIS geometry Polygon type"""

    type = "geo_polygon"
    geo_type = "POLYGON"


class GeoMultiLine(GeoField):
    """Field for POSTGIS geometry MultiLine type"""

    type = "geo_multi_line"
    geo_type = "MULTILINESTRING"


class GeoMultiPoint(GeoField):
    """Field for POSTGIS geometry MultiPoint type"""

    type = "geo_multi_point"
    geo_type = "MULTIPOINT"


class GeoMultiPolygon(GeoField):
    """Field for POSTGIS geometry MultiPolygon type"""

    type = "geo_multi_polygon"
    geo_type = "MULTIPOLYGON"


fields.GeoLine = GeoLine
fields.GeoPoint = GeoPoint
fields.GeoPolygon = GeoPolygon
fields.GeoMultiLine = GeoMultiLine
fields.GeoMultiPoint = GeoMultiPoint
fields.GeoMultiPolygon = GeoMultiPolygon

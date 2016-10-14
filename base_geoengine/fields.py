# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import logging
try:
    from shapely.geometry import Point
    from shapely.wkb import loads as wkbloads
    import geojson
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning('Shapely or geojson are not available in the sys path')

from openerp.fields import Field

from .geo_helper import geo_convertion_helper as convert
from operator import attrgetter


class GeoField(Field):
    """ The field descriptor contains the field definition common to all
    specialized fields for geolocalization. Subclasses must define a type
    and a geo_type. The type is the name of the corresponding column type,
    the geo_type is the name of the corresponding type in the GIS system.
    """

    geo_type = None

    _slots = {
        'dim': 2,
        'srid': 900913,
        'gist_index': True,
    }

    def convert_to_read(self, value, use_name_get=True):
        res = convert.value_to_shape(value)
        if res.is_empty:
            return False
        return geojson.dumps(res)

    # properties used by to_column() to create a column instance
    _column_dim = property(attrgetter('dim'))
    _column_srid = property(attrgetter('srid'))
    _column_gist_index = property(attrgetter('gist_index'))

    @classmethod
    def load_geo(cls, wkb):
        """Load geometry into browse record after read was done"""
        return wkbloads(wkb.decode('hex')) if wkb else False


class GeoLine(GeoField):
    """Field for POSTGIS geometry Line type"""
    type = 'geo_line'
    geo_type = 'LINESTRING'


class GeoMultiLine(GeoField):
    """Field for POSTGIS geometry MultiLine type"""
    type = 'geo_multi_line'
    geo_type = 'MULTILINESTRING'


class GeoMultiPoint(GeoField):
    """Field for POSTGIS geometry MultiPoint type"""
    type = 'geo_multi_point'
    geo_type = 'MULTIPOINT'


class GeoMultiPolygon(GeoField):
    """Field for POSTGIS geometry MultiPolygon type"""
    type = 'geo_multi_polygon'
    geo_type = 'MULTIPOLYGON'


class GeoPoint(GeoField):
    """Field for POSTGIS geometry Point type"""
    type = 'geo_point'
    geo_type = 'POINT'

    @classmethod
    def from_latlon(cls, cr, latitude, longitude):
        """  Convert a (latitude, longitude) into an UTM coordinate Point:
        """
        pt = Point(longitude, latitude)
        cr.execute("""
            SELECT
                ST_Transform(
                    ST_GeomFromText(%(wkt)s, 4326),
                    %(srid)s)
        """, {'wkt': pt.wkt,
              'srid': cls._slots['srid']})
        res = cr.fetchone()
        return cls.load_geo(res[0])


class GeoPolygon(GeoField):
    """Field for POSTGIS geometry Polygon type"""
    type = 'geo_polygon'
    geo_type = 'POLYGON'

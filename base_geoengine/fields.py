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

    geo_type = None
    dim = 2
    srid = 900913
    gist_index = True

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
        return wkb and wkbloads(wkb.decode('hex')) or False


class GeoLine(GeoField):
    type = 'geo_line'
    geo_type = 'LINESTRING'


class GeoMultiLine(GeoField):
    type = 'geo_multi_line'
    geo_type = 'MULTILINESTRING'


class GeoMultiPoint(GeoField):
    type = 'geo_multi_point'
    geo_type = 'MULTIPOINT'


class GeoMultiPolygon(GeoField):
    type = 'geo_multi_polygon'
    geo_type = 'MULTIPOLYGON'


class GeoPoint(GeoField):
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
              'srid': cls.srid})
        res = cr.fetchone()
        return cls.load_geo(res[0])


class GeoPolygon(GeoField):
    type = 'geo_polygon'
    geo_type = 'POLYGON'

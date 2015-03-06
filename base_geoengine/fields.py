import geojson
from openerp.fields import Field

from .geo_helper import geo_convertion_helper as convert


class GeoField(Field):
    def convert_to_read(self, value, use_name_get=True):
        res = convert.value_to_shape(value)
        if res.is_empty:
            return False
        return geojson.dumps(res)


class GeoLine(GeoField):
    type = 'geo_line'


class GeoMultiLine(GeoField):
    type = 'geo_multi_line'


class GeoMultiPoint(GeoField):
    type = 'geo_multi_point'


class GeoMultiPolygon(GeoField):
    type = 'geo_multi_polygon'


class GeoPoint(GeoField):
    type = 'geo_point'


class GeoPolygon(GeoField):
    type = 'geo_polygon'

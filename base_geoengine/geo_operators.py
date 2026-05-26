# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.tools import SQL


class GeoOperator:
    def __init__(self, geo_field):
        self.geo_field = geo_field

    def _get_direct_como_op_sql(self, alias, col, value, op):
        """SQL for area-comparison operators (geo_greater / geo_lesser)."""
        column = SQL.identifier(alias, col)
        if isinstance(value, int | float):
            return SQL("ST_Area(%s) %s %s", column, op, value)
        base = self.geo_field.entry_to_shape(value, same_type=False)
        return SQL(
            "ST_Area(%s) %s ST_Area(ST_GeomFromText(%s))",
            column,
            op,
            base.wkt,
        )

    def _get_postgis_comp_sql(self, alias, col, value, op):
        """SQL for spatial ST_xxx(a, b) postgis operators."""
        base = self.geo_field.entry_to_shape(value, same_type=False)
        return SQL(
            "%s(%s, ST_GeomFromText(%s, %s))",
            op,
            SQL.identifier(alias, col),
            base.wkt,
            self.geo_field.srid,
        )

    def get_geo_greater_sql(self, alias, col, value):
        return self._get_direct_como_op_sql(alias, col, value, SQL(">"))

    def get_geo_lesser_sql(self, alias, col, value):
        return self._get_direct_como_op_sql(alias, col, value, SQL("<"))

    def get_geo_equal_sql(self, alias, col, value):
        base = self.geo_field.entry_to_shape(value, same_type=False)
        return SQL(
            "%s = ST_GeomFromText(%s)",
            SQL.identifier(alias, col),
            base.wkt,
        )

    def get_geo_intersect_sql(self, alias, col, value):
        return self._get_postgis_comp_sql(alias, col, value, SQL("ST_Intersects"))

    def get_geo_touch_sql(self, alias, col, value):
        return self._get_postgis_comp_sql(alias, col, value, SQL("ST_Touches"))

    def get_geo_within_sql(self, alias, col, value):
        return self._get_postgis_comp_sql(alias, col, value, SQL("ST_Within"))

    def get_geo_contains_sql(self, alias, col, value):
        return self._get_postgis_comp_sql(alias, col, value, SQL("ST_Contains"))

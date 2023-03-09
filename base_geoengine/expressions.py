# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.osv import expression
from odoo.osv.expression import TERM_OPERATORS

from .fields import GeoField
from .geo_operators import GeoOperator

original__leaf_to_sql = expression.expression._expression__leaf_to_sql

GEO_OPERATORS = {
    "geo_greater": ">",
    "geo_lesser": "<",
    "geo_equal": "=",
    "geo_touch": "ST_Touches",
    "geo_within": "ST_Within",
    "geo_contains": "ST_Contains",
    "geo_intersect": "ST_Intersects",
}
term_operators_list = list(TERM_OPERATORS)
for op in GEO_OPERATORS:
    term_operators_list.append(op)

expression.TERM_OPERATORS = tuple(term_operators_list)


def __leaf_to_sql(self, leaf, model, alias):
    left, operator, right = leaf

    if isinstance(leaf, (list, tuple)):
        current_field = model._fields.get(left)
        current_operator = GeoOperator(current_field)
        if current_field and isinstance(current_field, GeoField):
            params = []
            if isinstance(right, dict):
                # We are having indirect geo_operator like (‘geom’, ‘geo_...’,
                # {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })
                ref_search = right
                sub_queries = []
                for key in ref_search:
                    i = key.rfind(".")
                    rel_model = key[0:i]
                    rel_col = key[i + 1 :]
                    rel_model = model.env[rel_model]
                    # we compute the attributes search on spatial rel
                    if ref_search[key]:
                        rel_query = rel_model._where_calc(
                            ref_search[key], active_test=True
                        )
                        model._apply_ir_rules(rel_query, "read")
                        if len(GEO_OPERATORS[operator]) > 1:
                            rel_query.add_where(
                                f'{GEO_OPERATORS[operator]}("{alias}"."{left}", {rel_col})'
                            )
                        else:
                            rel_query.add_where(
                                f'"{alias}"."{left}" {GEO_OPERATORS[operator]} {rel_col}'
                            )
                        subquery, subparams = rel_query.subselect("1")
                        sub_queries.append(f"EXISTS({subquery})")
                        params += subparams
                query = " AND ".join(sub_queries)
            else:
                query = get_geo_func(
                    current_operator, operator, left, right, params, model._table
                )
            return query, params
        return original__leaf_to_sql(self, leaf=leaf, model=model, alias=alias)


def get_geo_func(
    current_operator, operator, left, right, params, table, rel_col=None, rel_model=None
):
    match operator:
        case "geo_greater":
            query = current_operator.get_geo_greater_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
        case "geo_lesser":
            query = current_operator.get_geo_lesser_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
        case "geo_equal":
            query = current_operator.get_geo_equal_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
        case "geo_touch":
            query = current_operator.get_geo_touch_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
        case "geo_within":
            query = current_operator.get_geo_within_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
        case "geo_contains":
            query = current_operator.get_geo_contains_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
        case "geo_intersect":
            query = current_operator.get_geo_intersect_sql(
                table, left, right, params, rel_col=rel_col, rel_model=rel_model
            )
    return query


expression.expression._expression__leaf_to_sql = __leaf_to_sql

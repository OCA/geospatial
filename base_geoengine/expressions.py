# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.fields import Domain
from odoo.orm.domains import operator_optimization
from odoo.tools import SQL, Query

from .fields import GeoField
from .geo_operators import GeoOperator

GEO_OPERATORS = {
    "geo_greater": ">",
    "geo_lesser": "<",
    "geo_equal": "=",
    "geo_touch": "ST_Touches",
    "geo_within": "ST_Within",
    "geo_contains": "ST_Contains",
    "geo_intersect": "ST_Intersects",
}
GEO_SQL_OPERATORS = {
    "geo_greater": SQL(">"),
    "geo_lesser": SQL("<"),
    "geo_equal": SQL("="),
    "geo_touch": SQL("ST_Touches"),
    "geo_within": SQL("ST_Within"),
    "geo_contains": SQL("ST_Contains"),
    "geo_intersect": SQL("ST_Intersects"),
}


@operator_optimization(GEO_OPERATORS.keys())
def _optimize_geo_condition(condition, model):
    if not isinstance(model._fields.get(condition.field_expr), GeoField):
        return condition
    return Domain.custom(
        to_sql=lambda model, alias, query: _geo_condition_to_sql(
            model,
            alias,
            condition.field_expr,
            condition.operator,
            condition.value,
        )
    )


def _geo_condition_to_sql(model, alias: str, fname: str, operator: str, value) -> SQL:
    """Return SQL for custom geo operators used in Odoo domains."""
    current_field = model._fields[fname]
    model._check_field_access(current_field, "read")
    current_operator = GeoOperator(current_field)
    if isinstance(value, dict):
        # Indirect geo_operator like
        #   (geom, geo_..., {"res.zip.poly": [("id", "in", [1,2,3])]})
        sub_queries = []
        for key, sub_domain in value.items():
            if not sub_domain:
                continue
            i = key.rfind(".")
            rel_model = model.env[key[:i]]
            rel_col = key[i + 1 :]
            rel_alias = Query.make_alias(alias, key.replace(".", "_"))
            rel_query = where_calc(
                rel_model, sub_domain, active_test=True, alias=rel_alias
            )
            left = SQL.identifier(alias, fname)
            right = SQL.identifier(rel_query.table, rel_col)
            if operator == "geo_equal":
                rel_query.add_where(SQL("%s = %s", left, right))
            elif operator in ("geo_greater", "geo_lesser"):
                rel_query.add_where(
                    SQL(
                        "ST_Area(%s) %s ST_Area(%s)",
                        left,
                        GEO_SQL_OPERATORS[operator],
                        right,
                    )
                )
            else:
                rel_query.add_where(
                    SQL("%s(%s, %s)", GEO_SQL_OPERATORS[operator], left, right)
                )
            sub_queries.append(SQL("EXISTS%s", rel_query.subselect("1")))
        return SQL(" AND ").join(sub_queries) if sub_queries else SQL("TRUE")
    return get_geo_func(current_operator, operator, fname, value, alias)


def get_geo_func(current_operator, operator, fname, value, alias) -> SQL:
    """Dispatch the SQL builder for the requested geo operator."""
    match operator:
        case "geo_greater":
            return current_operator.get_geo_greater_sql(alias, fname, value)
        case "geo_lesser":
            return current_operator.get_geo_lesser_sql(alias, fname, value)
        case "geo_equal":
            return current_operator.get_geo_equal_sql(alias, fname, value)
        case "geo_touch":
            return current_operator.get_geo_touch_sql(alias, fname, value)
        case "geo_within":
            return current_operator.get_geo_within_sql(alias, fname, value)
        case "geo_contains":
            return current_operator.get_geo_contains_sql(alias, fname, value)
        case "geo_intersect":
            return current_operator.get_geo_intersect_sql(alias, fname, value)
        case _:
            raise NotImplementedError(f"The operator {operator} is not supported")


def where_calc(model, domain, active_test=True, alias=None):
    """
    Build a query for a related model while preserving the Odoo 19 domain flow.
    """
    if alias is None:
        return model._search(domain, active_test=active_test)

    check_access = not model.env.su
    if check_access:
        model.browse().check_access("read")

    domain = Domain(domain)
    if (
        model._active_name
        and active_test
        and model.env.context.get("active_test", True)
        and not any(
            leaf.field_expr == model._active_name for leaf in domain.iter_conditions()
        )
    ):
        domain &= Domain(model._active_name, "=", True)

    domain = domain.optimize_full(model)
    query = Query(model.env, alias, model._table_sql)
    if domain.is_false():
        query.add_where(SQL("FALSE"))
        return query
    if not domain.is_true():
        query.add_where(domain._to_sql(model, alias, query))

    if check_access:
        model_sudo = model.sudo().with_context(active_test=False)
        sec_domain = model.env["ir.rule"]._compute_domain(model._name, "read")
        sec_domain = sec_domain.optimize_full(model_sudo)
        if sec_domain.is_false():
            query.add_where(SQL("FALSE"))
            return query
        if not sec_domain.is_true():
            query.add_where(sec_domain._to_sql(model_sudo, alias, query))

    return query

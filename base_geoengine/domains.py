import contextlib

from odoo.fields import Domain
from odoo.models import BaseModel
from odoo.orm import domains
from odoo.orm.domains import (
    SQL,
    DomainCondition,
    OptimizationLevel,
    TableSQL,
)

GEO_OPERATORS = frozenset(
    [
        "geo_greater",
        "geo_lesser",
        "geo_equal",
        "geo_touch",
        "geo_within",
        "geo_contains",
        "geo_intersect",
    ]
)


def _to_sql(self, table: TableSQL) -> SQL:
    """Enhanced _to_sql that handles geospatial operators."""
    field_expr, operator, value = self.field_expr, self.operator, self.value

    # Only handle geospatial operators here, delegate everything else to original method
    if operator in GEO_OPERATORS:
        # Ensure geospatial conditions are fully optimized
        assert self._opt_level >= OptimizationLevel.FULL, (
            "Must fully optimize before generating the query "
            f"{(field_expr, operator, value)}"
        )

        model: BaseModel = table._model
        field = self._field(model)
        model.check_field_access(field, "read")
        return field.condition_to_sql(table, field_expr, operator, value)

    # For all other operators, use the original method
    return original__to_sql(self, table)


def _optimize_step(self, model: BaseModel, level: OptimizationLevel) -> Domain:
    """Optimization step for geospatial operators."""
    # For geospatial operators, we need to handle them specially during optimization
    # If this is a geospatial operator, mark it as optimized at FULL level
    if self.operator in GEO_OPERATORS:
        # Perform basic validation and normalization
        with contextlib.suppress(Exception):
            field = self._field(model)
            # Basic geospatial operator validation
            if hasattr(field, "geo_type"):  # It's a geospatial field
                # Create optimized version with FULL level
                optimized = DomainCondition(self.field_expr, self.operator, self.value)
                object.__setattr__(optimized, "_opt_level", OptimizationLevel.FULL)
                return optimized

    # Fall back to original optimization for non-geo operators
    return original__optimize_step(self, model, level)


# Store original methods before monkey patching
original__optimize_step = DomainCondition._optimize_step
original__to_sql = DomainCondition._to_sql

DomainCondition._to_sql = _to_sql
DomainCondition._optimize_step = _optimize_step

# The core DomainCondition.checked() reads this global at call time
domains.CONDITION_OPERATORS = domains.CONDITION_OPERATORS.union(GEO_OPERATORS)

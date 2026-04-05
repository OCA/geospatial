Adds proj4js support for non-standard SRIDs (EPSG:2056, EPSG:21781, etc.)
and fixes projection handling in the GeoEngine map renderer.

This module provides:

- Swisstopo raster layer type for Swiss national map backgrounds
- Automatic SRID detection from geo fields for correct projection handling
- proj4js-based coordinate transformation between projections (e.g., EPSG:3857 to EPSG:2056)
- Patched GeoEngine renderer to support multi-projection workflows

# Province and district map data

Downloaded 2026-10-18 from William J. Reynolds / DevelopedbyWill,
Thailand Canonical Administrative-Names Reference, data/v1.0.0:

- https://github.com/DevelopedbyWill/thailand-canonical-admin-names
- https://raw.githubusercontent.com/DevelopedbyWill/thailand-canonical-admin-names/main/data/v1.0.0/thailand-adm1-polygons-v1.0.0.geojson
- https://raw.githubusercontent.com/DevelopedbyWill/thailand-canonical-admin-names/main/data/v1.0.0/thailand-adm1-provinces-v1.0.0.csv
- https://raw.githubusercontent.com/DevelopedbyWill/thailand-canonical-admin-names/main/data/v1.0.0/thailand-adm2-polygons-v1.0.0.geojson
- https://raw.githubusercontent.com/DevelopedbyWill/thailand-canonical-admin-names/main/data/v1.0.0/thailand-adm2-districts-v1.0.0.csv

Province names and regions are extracted into shared/geography.ts; the original CSV is retained in shared/provinces-source.csv. The GeoJSON is retained unchanged. These are simplified display boundaries, not cadastral boundaries.

District names and parent province codes are extracted into shared/districts.ts; the original CSV is retained in shared/districts-source.csv. The unmodified district GeoJSON is served as thailand-districts.geojson and fetched when a province is first selected. The reference contains 928 districts, each joined to its boundary by TIS-1099 code; database IDs are not assumed to be these codes.

Data tables: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/.
Bundled polygons: OCHA Common Operational Datasets via piyayut-ch/mapthai,
CC BY 3.0 IGO lineage as described by the upstream repository:
https://creativecommons.org/licenses/by/3.0/igo/.

The upstream NOTICE.md is preserved alongside this file. Its statement that polygons are not redistributed predates the bundled geometry release; the current upstream README explicitly lists the ADM1 polygon file and its layered license. Consult that README and the source dataset for the current attribution details.

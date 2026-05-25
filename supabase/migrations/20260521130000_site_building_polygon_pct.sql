-- Building outlines on site ERF: store drawn polygon vertices (line tool, closed shape)
ALTER TABLE public.site_building_shapes
  ADD COLUMN IF NOT EXISTS polygon_pct JSONB NULL;

COMMENT ON COLUMN public.site_building_shapes.polygon_pct IS
  'Closed polygon as JSON array of {x_pct,y_pct} vertices (0–100). x/y/w/h remain bounding box for legacy queries.';

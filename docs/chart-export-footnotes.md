# Crop-friendly chart footnotes

Follow-up to PR90, using the owner's Nov. 6 supplied recording-hours reference.

The shared Copy chart / Download PNG serializer now finishes the title, plot and
existing legend with the official PL R&D logo and chart permalink. Supporting
notes come **after** that footer, separated by white space, so a rectangular crop
can keep the branded chart without the full annotation block. The complete
export still includes every previously visible note and all existing evidence
metadata. This is not automatic removal, a second export mode, or a data edit.

Footnotes use 14px `#667085` system-font text at the 1200px image layout, compared
with the unchanged 18px legend. Explicit source paragraph boundaries survive
wrapping, and each paragraph has a separate gap. A paragraph that starts with an
exact existing legend label followed by a colon receives a small matching color
key; the prose stays gray. Thus the five recording-hours datasets retain their
actual existing palette without recoloring plotted observations or adding new
series meanings. Generic caveats and source lists remain unkeyed.

Source coordinates, marker colors, scientific wording/qualifiers, complete
metadata, PNG/HTML/plain-link clipboard formats, clean URLs, image limits and
production authentication are unchanged. Cropping is a user action and removes
the notes they choose to exclude; the full image and linked chart retain them.

`data-export-crop-bottom` records an inert layout coordinate for regression and
native artifact verification. It adds no visible control or automatic crop.

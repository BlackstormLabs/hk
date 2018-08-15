# devkit-spriter

The devkit-spriter package provides three functions for the devkit build process:

 1. loading images
 2. spriting images into spritesheets
 3. caching spritesheets

## Loading Images

To load images, use the `loadImages(filenames : String[]) :
Promise<ImageInfo[]>` function:

    var spriter = require('devkit-spriter');
    spriter.loadImages(['image1.png', 'image2.png'])
        .then(function (images) {
            // images is an array of ImageInfo objects
        });

An `ImageInfo` object is a representation of an image that the spriter can use
to create spritesheets.  It has the following properites:

 - `x : int` the location of the image in a spritesheet
 - `y : int` the location of the image in a spritesheet
 - `filename : string` the full path to the image on disk
 - `hash : string` an md5 hash of the image bitmap
 - `buffer : ImageBuffer` the pixels of the image wrapped in a Jimp object
   (see https://github.com/oliver-moran/jimp). An ImageBuffer extends the Jimp
   base class with a `drawImage` call (based on the HTML5 canvas `drawImage`
   call and promisifies `getBuffer` and `write`.
 - `width : int` the original image width
 - `height : int` the original image height
 - `area : int` the image's area
 - `data : Buffer` the raw data in a node `Buffer`, alias for `buffer.bitmap.data`
 - `depth : int` the number of channels for the image, e.g. 4 for rgba
 - `hasAlphaChannel : boolean` true if the depth is 4
 - `margin : {top : int, right : int, bottom : int, left : int}` the size of
   the margins around the image (transparent regions in original image)
 - `contentWidth : int` the width minus the margins
 - `contentHeight : int` the height minus the margins
 - `contentArea : int` the content area, the number of pixels this image will
   occupy on a spritesheet (excluding spritesheet padding)

## Spriting images

To sprite images, first load them into ImageInfo objects.  Then call
`layout(ImageInfo[], opts) : Spritesheet[]`:

    var spritesheets = spriter.layout(images);

Note that this is a synchronous call since no IO is performed.  This call
maybe expensive, depending on how many images you provide.

`opts` can include:
 - `padding : int` number of pixels on each side of an image to pad out the
   image.  Padding works by extending the border of the image.  Defaults to
   `2`, which prevents most texture artifacts in OpenGL.
 - `maxSize : int` the largest dimension of a spritesheet.  Spritesheets
   cannot exceed this value in either width or height.  Defaults to `1024`.
 - `powerOfTwoSheets : boolean` whether sheets should round their dimensions
   up to the nearest power of two.  Defaults to `true`.
 - `name : string` a prefix for spritesheet names
 - `ext : string` a postfix for all spritesheet names

## Caching spritesheets

The spriter provides utility functions for reading and writing to a disk
cache.  It verifies the integrity of the disk cache before returning cached
results.  Call `loadCache(cacheFile : string, outputDirectory :
string) : Promise<DiskCache>` to load a disk cache file:

    var group = 'group1';
    var filenames = ['image1.png', 'image2.png'];

    spriter.loadCache('.my-cache-file', 'build/spritesheets/')
        .get(group, filenames)
        .then(function () {
            // cached
        })
        .catch(Spriter.NotCachedError, function () {
            // should resprite
        });

The spriter is commonly used with groups of spritesheets, since a common use
case is to sprite images that will probably be used together into the same
spritesheet(s).  For example, all sprites in a common animation should be
placed in a single group.  Compression is another example of grouping: images
compressed as jpgs should be sprited separately from images compressed as pngs
so that the resulting spritesheets can be compressed correctly.

Calling `get` on `DiskCache` verifies the following:

 - no files were added to the group
 - no files were removed from the group
 - no files have changed in the group (comparing modified times)
 - the generated spritesheet files still exist
 - the spritesheet data looks valid (every sheet has a name and images, every
   image in the spritesheet is in the group)


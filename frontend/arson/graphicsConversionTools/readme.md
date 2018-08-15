Graphics Conversion Tools

New in this update!

-fast        option (takes about 3 minutes instead of 90. Good for day to day use, but not final builds)
-clear_cache clears the cache directory an json cache data before the run
-verbose     adds more logging

Older:

Purpose
    * Crawl through a directory three which has "resources" and "spritesheets" folders, compressing the
        pngs (with pngquant and ImageOptim) and jpgs (with Guetzli).
    * Allow the following exceptions to normal compression:
        * pass_through (no compression is done)
        * posterize (image is posterized use case is bullets in Everwing)
        * force_jpg (png is compressed by Guetzli into a jpg -- use case is very large bitmaps with lots of
            colors such as huge Events banners in Everwing)
        *solid_font (image is posterized with low number of alpha levels, then quantized)

Contents
    * graphicsCompression.jpg
        The Javascript program that does the work. Run it with "node graphicsCompression.jpg"

    * bin
        folder that stores the executables

    * cache
        folder that stores the results of the compression. Having this cache is good because we only
            compress files that haven't been compressed before.
        To delete the cache, delete all the files and change the json file below to {}

    * cacheDataFile.json
        file that stores the filename, hash of the source data, hash of the dest data, before file size,
            and after file size
        To delete this, replace it with a file consisting only of empty braces {}. You should delete the
            files from the cache direectory if you do this.

    * settings.json
        directories needed for processing
            //settings
            //  be sure to have a settings file
            // cats has it nested two deep
            /*
            {
                "path": "../../build/release/browser-mobile",
                "overridesFile": "./spritesheetCompressionOverrides.json",
                "cacheDataFile": "./cacheDataFile.json"
            }
            */
            // everwing has it nested one deep
            /*
            {
                "path": "../build/release/browser-mobile",
                "overridesFile": "./spritesheetCompressionOverrides.json",
                "cacheDataFile": "./cacheDataFile.json"
            }
            */

    * spritesheetCompressionOverrides.json
        file that controls parameters sent to the executables that do the work

Usage:
    Almost always, you should:
    1) Delete the build directory
    2) npm run build
    3) node graphicsCompression.js

    Periodically, especially after changing the names or number of files, you should clear
        the cache (delete all the files in the cache folder and change the cacheDataFile to {} ).

## Changelog

```
/**
 * SpritesheetCompression
 * Copyright 2017 Blackstorm Labs. All Rights Reserved.
 * Rhett Anderson
 *
 * Version 1.1.14 (Thu 8 Feb 2018)
 *  - New hashing function that is consistent across Sierra/High Sierra.
 *
 * Version 1.1.13 (Tue 8 Feb 2018)
 *  - Changed 'friendly name' format of the image cache. This affects both cache file names
 *      and `spritesheetCompressionOverrides.json` entries. New format omits the prefix
 *      (e.g. `build_release_browser-mobile_`).
 *
 * Version 1.1.12 (Tue 6 Feb 2018)
 *  - Added support for extended override parameters (quality, rgbAmount, alphaAmount).
 *
 * Version 1.1.11 (Fri 2 Feb 2018)
 *  - Fixed a bug that would not allow to run compression if directory path contained a space.
 *
 * Version 1.1.10 (Mon 8 Jan 2018)
 *  - Added support for multiple input directories (if `path` option is an array).
 *
 * Version 1.1.9 (Mon 13 Nov 2017)
 *  - Store compression mode (`modeDebug` or `modeRelease`) along with override params in cache
 *      and invalidate cache when the mode differs.
 *
 * Version 1.1.8 (Thu 26 Oct 2017)
 *  - Cache is now tied to the library version and invalidates if outdated
 *  - Override parameters are now stored in cache to compare with new ones when validating cache
 *
 * Version 1.1.7 (Wed 18 Oct 2017)
 *  - Added "lossless" option for BAM, so that they can get some compression even if they can't palettize
 *
 * Version 1.1.6 (Thu 12 Oct 2017)
 *
 *  - At one point, the ability of this code to create a new cache folder when it has been deleted stopped
 *       working. Fixed.
 *  - Use ImageOptim's version of guetzli and pngquant in the hope they are statically linked (some hint on
 *       bulletin boards that this may be the case). This is an attempt to make all computers generate the
 *      same pngs and jpgs.
 *
 * Version 1.1.5 (Tue 10 Oct 2017)
 *  - Fix bug that was causing jpgs files to not get written to cache
 *
 * Version 1.1.4 (Tue 17 Sep 2017)
 *  - allow spaces in path names (for Peter)
 *  - Create cache if needed
 *  - use promise to block build until done
 *
 * Version 1.1.3 (Tue 12 Sep 2017)
 *  - Catered to Arson
 *
 * Version 1.1.2 (Mon 11 Sep 2017)
 *  - Instead of single path in settings, debugPath and releasePath
 *  - Added command line param -debug to compress in debugPath. Default path is releasePath.
 *
 * Version 1.1.1 (Tue 29 Aug 2017)
 *  - Add -fast, -clear_cache, and verbose command line options
 *
 * Version 1.1.0 (Mon 28 Aug 2017)
 *  - Catch up version
 *  - Added custom-built posterizer
 *  - Added special mode for fonts
 *
 * Version 1.0.5 (Wed 22-23 Aug 2017)
 *  - Fixed for cats
 *  - added pass_through, posterize, and force_jpg options
 *  - rewrote readme
 *
 * Version 1.0.4 (Sat 19 Aug 2017)
 *  - Get rid of fixup functionality (code that toggled pngs to jpg)
 *  - Count files from 1 instead of 0
 *  - Better coloring and formatting of data
 *  - Reporting of compression ratio and texture area.
 *  - Uses json file for settings (paths)
 *
 * Version 1.0.3 (Fri 18 Aug 2017)
 *  - Added version string
 *
 * Version 1.0.2 (Sun 13 Aug 2017)
 *  - Don't use the simple filename as a key--we have some identical filenames in different
 *    directories. Instead, use a version of the full file path.
 *  - Fixed the file counter (it was in the wrong place so it lost its way)
 *
 * Version 1.0.1 (Tue 7 Aug 2017)
 *  - Added pass to go through everwing/resources and fix up the pngs that should be jpgs
 *  - Added counter so you can tell how many files have been processed and how far you have to go
 *
 * Version 1.0.0 (Mon 6 Aug 2017)
 *  Original version
 *
 * Setup:
 *  make sure path is pointed to the spritesheets directory
 *      the original png files will be overwritten
 *
 *  to override pngquant's defaults, use a spritesheetCompressionOverrides.json file
 *      It's a list of filenames and parameters. It should look something like this:
 *
 * { "cats2.png" : "--posterize 4" }
 *
 * Note that this is synchronous task and takes a very long time (over an hour).
 *
 * A cache saves results so work is only done if the art changes or if you change an override
 *
 * Usage:
 *  node graphicsCompression.js
 */
```

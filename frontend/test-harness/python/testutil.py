import time, json, re, sys, os

# === special test dependencies ==================
# 3rd party modules
# Pillow -- a fork of PIL
# dependencies:         brew install libtiff libjpeg webp little-cms2
#                       pip install --user Pillow
try:
    from PIL import Image, ImageChops
except ImportError:
    print "Import Error of PIL. Solution Install Pillow from https://pillow.readthedocs.io/en/5.0.0/installation.html"
    pass
# ===============================================

# ----- CLASS LocalStorage -----
# from: https://stackoverflow.com/questions/46361494/how-to-get-the-localstorage-with-python-and-selenium-webdriver
#       The python selenium API doesn't provide a way to directly read/write the local storage,
#       but it can be done with  execute_script.
# Usage examples:
# # get the local storage
#       storage = LocalStorage(driver)
# # set an item
#       storage.set("mykey", 1234)
# # get an item
#       print(storage.get("mykey"))
# # remove an item
#       storage.remove("mykey")
# # get all items
#       for key, value in storage.get().items():
#           print(key + ': ' + value)
# # delete all items
#       storage.clear()
class LocalStorage:
    def __init__(self, driver):
        self.driver = driver

    def set(self, key, value):
        self.driver.execute_script("window.localStorage.setItem('{}',{})".format(key, json.dumps(value)))

    def get(self, key=None):
        if key:
            return self.driver.execute_script("return window.localStorage.getItem('{}')".format(key))
        else:
            return self.driver.execute_script("""
                var items = {}, ls = window.localStorage;
                for (var i = 0, k; i < ls.length; i++)
                items[k = ls.key(i)] = ls.getItem(k);
                return items;
            """)

    def remove(self, key):
        self.driver.execute_script("window.localStorage.removeItem('{}');".format(key))

    def clear(self):
        self.driver.execute_script("window.localStorage.clear();")
# ----------------------------------

# ----- Using Pillow -----
# Pillow (import Image) "Image is the most important module"
# >>> from PIL import Image
# open an image
# >>> im = Image.open("./some_file_name.png")
# save an image
# >>> im.save("./some_other_file_name.png")
# crop an image
# >>> box_to_crop = (x1,y1, x2,y2)
# >>> cropped_image = im.crop(box_to_crop)

# crops the image file at image_path
# dimensions of the crop are box_to_crop which is a rectangle defined by a tuple like this: (x1,y1,x2,y2)
# returns a cropped image at image_path unless cropped_file_path is provided
def cropImage(image_path,box_to_crop=(0,0, 10,10),cropped_file_path=""):
    if os.path.exists(image_path):
        full_image      = Image.open(image_path)
        cropped_image   = full_image.crop(box_to_crop)
        if cropped_file_path=="":
            cropped_file_path = image_path
        cropped_image.save(cropped_file_path)
    else:
        print(  "ERR: cropImage(). "+image_path+" does not exist")

# Compare image function from
# https://qxf2.com/blog/selenium-html5-canvas-verify-what-was-drawn/ 
def imagesAreEqual(img_actual,img_expected,result=""):
    # Returns true if the images are identical (all pixels in the difference image are zero)
    result_flag = False

    #Check that the images we are comparing exist
    if os.path.exists(img_actual):
        
        actual = Image.open(img_actual)
        expected=0
        if os.path.exists(img_expected):
            expected = Image.open(img_expected)
        else:
            # on the first run we copy the expected and return an error
            expected = actual.save(img_expected)
            print ' Expected image was missing, so a copy was made of '+img_actual+'.'
            return result_flag
        result_image = ImageChops.difference(actual,expected)

        #Where the real magic happens
        if (result_image.getbbox() is None):
            result_flag = True
        else:
            result_flag = False
            if result!="":
                #Result image will look black in places where the two images match
                color_matrix = ([0] + ([255] * 255))
                result_image = result_image.convert('L')
                result_image = result_image.point(color_matrix)
                result_image.save(result)#Save the result image
    else:
        if not os.path.exists(img_expected):
            print '   Missing baseline image: %s'%(img_expected)
        if not os.path.exists(img_actual):
            print '   Missing image to compare: %s'%(img_actual)

    return result_flag
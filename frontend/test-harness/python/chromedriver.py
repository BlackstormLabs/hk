import time, re, sys, os

# === special test dependencies ==================
# 3rd party modules
# selenium python bindings (we also use the chrome webdriver)
# chrome web driver:    brew install chrome driver
# selenium python:      sudo easy_install selenium
try:
    from selenium import webdriver
except ImportError:
    raise MissingDependency("Install selenium python bindings:\t $ sudo easy_install selenium \nInstall chrome webdriver:\t $ brew install chrome driver")
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
# our python includes
# let python know where to look
sys.path.append("./")
# import includes
import testutil as util
# ===============================================

# FUNCTIONS =====================================

# Start up selenium and chrome
# default is a width of 500 and height of 899 and to set log to capture ALL
def start(window_x=500,window_y=899,logging='ALL'):
    # set browser log 
    d = DesiredCapabilities.CHROME
    d['loggingPrefs'] = { 'browser':logging }
    # launch the driver
    selenium_browser = webdriver.Chrome(desired_capabilities=d)
    selenium_browser.set_window_size(window_x,window_y)
    selenium_browser.set_window_position(0,0)
    return selenium_browser

def stop(selenium_browser):
    selenium_browser.quit()

def click(selenium_browser,coordinates,seconds_to_catch_up=0.0):
    game_space = selenium_browser.find_element_by_tag_name('body')
    action = webdriver.common.action_chains.ActionChains(selenium_browser)
    action.move_to_element_with_offset(game_space, coordinates["x"], coordinates["y"])
    if (seconds_to_catch_up>0.0):
        print("Pause "+str(seconds_to_catch_up))
        action.pause(seconds_to_catch_up)
    action.click()
    action.perform()

def drag(selenium_browser,coords_press,coords_release):
    game_space = selenium_browser.find_element_by_tag_name('body')
    action = webdriver.common.action_chains.ActionChains(selenium_browser)
    action.move_to_element_with_offset(game_space, coords_press["x"], coords_press["y"])
    action.click_and_hold()
    action.move_to_element_with_offset(game_space, coords_release["x"], coords_release["y"])
    action.release()
    action.perform()

# typical canvas id is timestep_onscreen_canvas
def getPNGofCanvas(selenium_browser,canvas_id,file="./canvas.png",rect_to_crop=0):
    # should check if this worked or not, and change the return value for an error
    selenium_browser.save_screenshot(file)
    if os.path.exists(file):
        # so far success, now lets see if we need to crop it
        if rect_to_crop != 0:
            util.cropImage(file,rect_to_crop)
    else:
        file = ""

    # this code below for one reason or another is exporting a blank png
    #selenium_browser.switch_to_default_content()
    #javascript_to_execute = 'return document.getElementById("'+canvas_id+'").toDataURL("image/png");'
    #png_data_url = selenium_browser.execute_script(javascript_to_execute)
    ##Parse the URI to get only the base64 part
    #isolated    = re.search(r'base64,(.*)',png_data_url).group(1)
    ##Write out the image
    #with open(file, "wb") as fh:
    #    fh.write(isolated.decode('base64'))
    return file

# the purpose of this was to allow the game UI to do stuff after an action chain was executed
# but I have been unable to  work because it also seems to pause the entire game
class _when_done(object):
    def __init__(self,start_time,seconds_required):
        # selenium checks every 500 miliseconds, so we need to allow it that much extra time
        self.start_time = start_time - 0.500
        self.seconds_required = seconds_required
    def __call__(self,arg):
        if ((time.time()-self.start_time) >= self.seconds_required):
            return True
        else:
            return False

def pause(selenium_browser,seconds_required=1.0):
    start_time = time.time()
    WebDriverWait(selenium_browser, seconds_required).until( _when_done(start_time,seconds_required) )
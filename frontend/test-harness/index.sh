#!/bin/bash

# GLOBALS and CONFIGURATION -----------------------------
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../.."
ROOT="$( pwd )"
PORT=1234
# default, but changed in game_server_setup if webpack dev server found
HOST=http://localhost:$PORT/index.html
# hardcoded in arson's webpack.config.js, but if it ever becomes gettable we would get it here
WEBPACK_SERVER=https://localhost:8080/webpack-dev-server/
# process id for the game server
SERVER_PID=
# tracking the number of tests which gave an error
errors=0
# flag for forcing display of the build process output
VERBOSE=0
# default condition is to compile scripts
BUILD=1
# default build-type. change this with -t --type is desired
build_type=development
# flag for changing the target / build type
SET_TYPE=0
set_type=production
# default, but can be changed with --type
BUILT_GAME=/build/debug/browser-mobile/
# flag for keeping the server alive
KEEP=0
# accept an argument which is the name of a file in tests
test_list=()

# FUNCTIONS ----------------------------------------------
do_help()
{
    echo ""
    echo "Usage: npm test -- [-f|--file <file>] [-t|--type <type>] [-v|--verbose] [-n|--nocompile] [-k|--keep] [-h|--help]"
    echo ""
    echo -e " -f <file>   Only run specified tests. <file> names one or more files in ./tests."
    echo -e " -t <type>   Target <type>: \033[1mproduction\033[0m or \033[1mdevelopment\033[0m. When <type> is unspecified: \033[1mproduction\033[0m. Default: \033[1mdevelopment\033[0m."
    echo -e " -n          Skip test script compilation (unless missing ./dist/tests)"
    echo -e " -v          Display output of test script compilation (unless compilation is skipped)"
    echo -e " -k          Keep game server alive after exit."
    echo -e " -h          Display this help text."
    echo ""
    echo "Typical Behavior:"
    echo -e " Test scripts compiled."
    echo -e " The game is served at \033[1m$HOST\033[0m from target: \033[1m.$BUILT_GAME\033[0m."
    echo -e " All tests in \033[1m./tests\033[0m are executed unless only one or more are explicitly called for with \033[1m-f\033[0m."
    echo -e " Summary of the results is provided. Detailed test logs and reports should be in \033[1m./tests\033[0m."
    echo -e " Game server killed on exit."
    echo ""
    echo "Note:"
    echo -e " NPM can pass arguments to scripts like this one, but to ensure that NPM does not consume them first,"
    echo -e " you must use -- as the first argument. Thus \033[1mnpm test -- -h\033[0m is required to view help."
    echo ""
}

check_dist_tests()
{
    local is_ok=0

    if [ ! -d "$ROOT/dist/tests/" ]; then
        # directory does not exist
        is_ok=0
    else
        echo "Directory exists"
        file_list=(`find $ROOT/dist/tests -maxdepth 1 -name "*.js"`)
        for i in "${file_list[@]}"
        do
            if [[ "$i" != *clientSchema.js ]]; then
                is_ok=1
                break
            fi
        done
        # if [ ${#file_list[@]} -gt 0 ]; then 
        #     echo "... and is empty"
        #     # directory is completely empty
        #     is_ok=0
        # else
        #     echo "... and has files..."
        #     # has files, so now look for a file other than clientSchema

        # fi
    fi

    echo "$is_ok"
}

set_type()
{
    echo "Setting Target:"
    echo ""
    # good place to branch between types of builds
    if [[ "$set_type" == development ]]; then
        # development...:
        # this is packed in the webpack scripts and I dunno how to get it, but maybe someday we would get and assign it here
        build_type=development
        BUILT_GAME=/build/debug/browser-mobile/
    else
        # production...:
        build_type=production
        BUILT_GAME=/build/release/browser-mobile/
    fi
    echo "Environment: $build_type"
    echo "Game:        $BUILT_GAME"
    echo ""
    echo "----------------------------------"
}

do_build()
{
    echo "Compiling test scripts:"
    echo ""
    echo "Environment: $build_type"
    # good place to branch between types of builds
    if [[ "$build_type" == production ]]; then
        # production...:
        if [[ $VERBOSE == "1" ]]; then
            webpack --config tests/webpack.config.js --env.buildType production
        else
            echo "Standard output suppressed."
            webpack --config tests/webpack.config.js --env.buildType production >/dev/null
        fi
    else
        # development...:
        if [[ $VERBOSE == "1" ]]; then
            webpack --config tests/webpack.config.js --env.buildType development
        else
            echo "Standard output suppressed."
            webpack --config tests/webpack.config.js --env.buildType development >/dev/null
        fi
    fi
    echo ""
    echo "----------------------------------"
}

# here we target a server for our game tests (in case any tests will need it)
game_server_setup()
{
    # if the game is being served by npm run serve we will switch our target to it
    SERVER_STATUS=$(curl --write-out %{http_code} --silent --insecure --output /dev/null $WEBPACK_SERVER)
    if [[ $build_type == development && $SERVER_STATUS == 200 ]]; then
        HOST=$WEBPACK_SERVER
        PORT=8080
        KEEP=1
        SERVER_PID=
        echo "Found game server:"
        echo ""
        echo "URL:    $HOST"
        echo "Status: $SERVER_STATUS"
        echo ""
    # else serve game locally on port PORT (see globals)
    else
        echo "Creating game server:"
        echo ""
        cd $ROOT$BUILT_GAME
        pwd
        python -m SimpleHTTPServer $PORT &> /dev/null &
        SERVER_PID=$!
        # Give server time to start up
        sleep 1
        echo "URL:    $HOST"
        SERVER_STATUS="$(curl --write-out %{http_code} --silent --output /dev/null localhost:$PORT)"
        echo "Status: $SERVER_STATUS"
        echo ""
        if [ "$SERVER_STATUS" != "200" ] ; then
            echo -e "\033[1;31mServer Failed to Launch Successfully!\033[0m"
            exit 1
        fi
    fi
    echo "----------------------------------"
}

run_test()
{
    test=$1
    test_vars=$2
    # test_pid=
    err=0
    if [[ "$test" == *.js || "$test" == *.ts ]]; then
        # change $test with .ts to .js
        test=${test%.*}.js
        echo ""
        echo "> mocha --bail dist/tests/$test"
        echo "   .   .   .   .   .   "
        export $test_vars && mocha --bail $ROOT/dist/tests/$test
        # test_pid=$!
        err=$?
    elif [[ "$test" == *.py ]]; then
        echo ""
        echo "> python tests/$test"
        echo "   .   .   .   .   .   "
        export $test_vars && python $ROOT/tests/$test
        # test_pid=$!
        err=$?
    else
        return 0
    fi

    if [ $err -eq 0 ]; then
        echo -e "   \033[1;32mPass\033[0m"
    else
        echo -e "   \033[1;31mFail\033[0m"
    fi
    echo "   .   .   .   .   .   "
    return $err
}

cleanup()
{
    # KEEP server alive
    if [ $KEEP -eq 1 ]; then
        echo "Sustaining:"
        if [ -n "$SERVER_PID" ]; then
            echo -e "Game server: \033[1m$SERVER_PID\033[0m."
        else
            echo -e "Webpack Dev Server at $WEBPACK_SERVER"
        fi
        if [ -n "$SERVER_PID" ]; then
            echo -e "Manual termination required: \033[1mkill ####\033[0m."
        fi
    # Stop server (Default condition)
    else
        if [ -n "$SERVER_PID" ]; then
            echo "Killing game server."
            kill "${SERVER_PID}"
        fi
    fi
    echo "=================================="
    echo ""
}
trap cleanup EXIT

# ARGUMENTS ----------------------------------------------
# Loop until all parameters are used up
temp_count=0
while [ "$1" != "" ]; do
    case $1 in
        -f | --file )           while [[ ${2:0:1} != "-" && ! -z $2 ]]
                                do
                                    shift
                                    test_list[$temp_count]="$1"
                                    let temp_count++
                                done
                                ;;
        -v | --verbose )        VERBOSE=1
                                ;;
        -n | --nobuild )        BUILD=0
                                ;;
        -t | --type )           SET_TYPE=1
                                if [[ ${2:0:1} != "-" ]] && [[ ! -z $2 ]]; then shift;set_type=$1;fi
                                ;;
        -k | --keep )           KEEP=1
                                ;;
        -h | --help )           do_help
                                exit 0
                                ;;
        * )                     exit 1
    esac
    shift
done

# EXECUTES -----------------------------------------------
echo "=================================="

# set the type here if called for
if [[ $SET_TYPE == "1" ]]; then
    # build_type is used. a global which indicates 'development' or 'production'
    set_type
fi

# compile the scripts
if [[ $BUILD == "1" || $(check_dist_tests) == "0" ]]; then
    # build_type is used. a global which indicates 'development' or 'production'
    do_build
fi

# get an active server or make one
game_server_setup

# run our tests
echo "Testing:"
cd $ROOT/tests
send_test_vars="GAME_HOST=$HOST GAME_ROOT=$ROOT"
tests_run=0
# if test_list specified by -f exists
if [[ -n "${test_list[*]}" ]]; then
    for test in "${test_list[@]}"; do
    echo "$test"
    [[ -f $test && ("$test" == *.py || "$test" == *.js || "$test" == *.ts) ]] || continue
        # test found in array so execute
        run_test $test "$send_test_vars"
        err=$?
        errors=$((errors+$err))
        tests_run=$tests_run+1
    done
fi
if [[ $tests_run == 0 ]]; then
    # no tests run so...
    # execute every file in ./tests
    for test in *; do
        # except those beginning with _
        [[ -f $test && $test != _* && $test != webpack.config.js ]] || continue
        run_test $test "$send_test_vars"
        err=$?
        errors=$((errors+$err))
    done
fi

echo ""
# brief results
echo "Testing completed!"
echo ""
if [ "$errors" != "0" ] ; then
    echo -e "ERRORS: \033[1;31m$errors\033[0m"
    echo -e "See results in $ROOT/tests for more information."
else
    echo -e "STATUS: \033[1;32mpassed\033[0m"
fi
echo ""
echo "----------------------------------"
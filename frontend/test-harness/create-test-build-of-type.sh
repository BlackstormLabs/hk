#!/bin/bash

# GLOBALS and CONFIGURATION -----------------------------
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../.."
ROOT="$( pwd )"

BUILD_TYPE="production"

# FUNCTIONS ----------------------------------------------
do_help()
{
    echo ""
    echo "Usage: npm run build-test -- [-b|--build-type <envs>] [-h|--help]"
    echo ""
    echo -e " -b <envs>   Target <env>: file name of ./envs like production or development"
    echo -e " -h          Display this help text."
    echo ""
    echo "Notes:"
    echo -e " All builds created with this script are intended for automated testing."
    echo -e " Different build types can be built for testing." 
    echo -e " The --build-type argument allows specification of the build type."
    echo -e " Production is the default type, and is used if type is unspecified."
    echo ""
    echo "Important:"
    echo -e " The test build is created in the OUTPUTDIR appropriate for the build type."
    echo -e " When testing is done, delete or overwrite the test build to avoid confusion."
    echo ""
}

# ARGUMENTS ----------------------------------------------
# Loop until all parameters are used up
temp_count=0
while [ "$1" != "" ]; do
    case $1 in
        -b | --build-type )     if [[ ${2:0:1} != "-" ]] && [[ ! -z $2 ]]; then shift;BUILD_TYPE=$1;fi
                                ;;
        -h | --help )           do_help
                                exit 0
                                ;;
        * )                     exit 1
    esac
    shift
done

# ensure that BUILD_TYPE is in envs/ 
cd $ROOT/envs
if [[ -f $BUILD_TYPE ]]; then
  cd $ROOT
  . envs/test && webpack --env.buildType $BUILD_TYPE
else
  cd $ROOT
  echo "$BUILD_TYPE is not in $ROOT/envs"
  echo ""
fi


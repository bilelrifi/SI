#pipeline where podman compose get installed "33" 
pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"

        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"

        PODMAN_COMPOSE_FILE = "podman-compose.yml"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        echo "Token length: ${#OC_TOKEN}"
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in and switched to project: ${PROJECT_NAME}"
                        oc whoami
                        oc project
                    '''
                }
            }
        }

        stage('Install podman-compose') {
            steps {
                sh '''
                    echo "Trying to install podman and pip with yum..."

                    # Try to install podman and pip using yum (for RHEL/CentOS 7)
                    if command -v yum > /dev/null; then
                        sudo yum install -y epel-release || true
                        sudo yum install -y podman python3-pip
                    else
                        echo "yum not found. Falling back to apt or dnf..."
                        if command -v dnf > /dev/null; then
                            sudo dnf install -y podman python3-pip
                        elif command -v apt-get > /dev/null; then
                            sudo apt-get update
                            sudo apt-get install -y podman python3-pip
                        else
                            echo "No supported package manager found."
                            exit 1
                        fi
                    fi

                    echo "Installing podman-compose via pip..."
                    pip3 install --user --upgrade pip
                    pip3 install --user podman-compose

                    echo "podman-compose installation complete."
                '''
            }
        }

    /*    stage('Install Python 3.9 and podman-compose') {
            steps {
                sh '''
                    echo "Checking Python version..."
                    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')

                    if [ "$PYTHON_VERSION" != "3.9" ] && [ "$PYTHON_VERSION" != "3.10" ] && [ "$PYTHON_VERSION" != "3.11" ]; then
                        echo "Upgrading to Python 3.9..."
                        if command -v apt-get &> /dev/null; then
                            sudo apt-get update
                            sudo apt-get install -y software-properties-common
                            sudo add-apt-repository -y ppa:deadsnakes/ppa
                            sudo apt-get update
                            sudo apt-get install -y python3.9 python3.9-distutils python3.9-venv
                            sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1
                            curl -sS https://bootstrap.pypa.io/get-pip.py | sudo python3.9
                        else
                            echo "Unsupported OS for automated Python upgrade. Install Python 3.9+ manually."
                            exit 1
                        fi
                    fi

                    echo "Installing podman-compose..."
                    pip3 install --user --upgrade podman-compose

                    export PATH=$HOME/.local/bin:$PATH
                    podman-compose --version
                '''
            }
        } */


        stage('Build Frontend Image') {
            steps {
                sh """
                    echo "Building frontend image using podman-compose..."
                    podman-compose -f ${PODMAN_COMPOSE_FILE} build frontend
                """
            }
        }

        stage('Build Backend Image') {
            steps {
                sh """
                    echo "Building backend image using podman-compose..."
                    podman-compose -f ${PODMAN_COMPOSE_FILE} build backend
                """
            }
        }

        stage('Tag Images') {
            steps {
                sh """
                    echo "Images are already tagged in podman-compose.yml. Skipping manual tagging."
                """
            }
        }

        stage('Push to Quay.io') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh """
                        echo "Logging into Quay.io..."
                        podman login quay.io -u $QUAY_USER -p $QUAY_PASS
                        echo "Pushing frontend image to Quay.io..."
                        podman push ${FRONTEND_IMAGE}
                        echo "Pushing backend image to Quay.io..."
                        podman push ${BACKEND_IMAGE}
                    """
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh """
                        echo "Deploying applications to OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        echo "Deleting existing frontend and backend resources (if any)..."
                        oc delete all -l app=job-frontend || true
                        oc delete all -l app=job-backend || true

                        echo "Creating new frontend application..."
                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        echo "Creating new backend application..."
                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend
                    """
                }
            }
        }
    }
}

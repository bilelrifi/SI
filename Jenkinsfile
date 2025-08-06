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
                    echo "Installing podman-compose..."

                    # Check if podman-compose exists
                    if ! command -v podman-compose &> /dev/null; then
                        # Install pip and podman-compose
                        echo "podman-compose not found, installing..."
                
                        # Try installing pip (if missing)
                        if ! command -v pip3 &> /dev/null; then
                            echo "pip3 not found, attempting to install..."
                            if command -v apt-get &> /dev/null; then
                                sudo apt-get update && sudo apt-get install -y python3-pip
                            elif command -v dnf &> /dev/null; then
                                sudo dnf install -y python3-pip
                            elif command -v yum &> /dev/null; then
                                sudo yum install -y python3-pip
                            else
                                echo "Unsupported package manager. Cannot install pip."
                                exit 1
                            fi
                        fi

                        # Install podman-compose
                        pip3 install --user podman-compose
                        export PATH="$HOME/.local/bin:$PATH"
                    else
                        echo "podman-compose already installed."
                    fi

                    podman-compose --version || echo "podman-compose install failed"
                '''
            }
        } 


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

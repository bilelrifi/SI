pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp.smartek.ae:6443"

        REGISTRY_CREDENTIALS = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
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
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in to project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build Frontend Image with OpenShift') {
            steps {
                sh '''
                    echo "Building frontend image using OpenShift BuildConfig..."
                    if ! oc get bc frontend; then
                        oc new-build --binary --name=frontend --strategy=docker
                    fi
                    oc start-build frontend --from-dir=frontend --wait --follow
                '''
            }
        }

        stage('Build Backend Image with OpenShift') {
            steps {
                sh '''
                    echo "Building backend image using OpenShift BuildConfig..."
                    if ! oc get bc backend; then
                        oc new-build --binary --name=backend --strategy=docker
                    fi
                    oc start-build backend --from-dir=backend --wait --follow
                '''
            }
        }

        stage('Push to Quay.io') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${REGISTRY_CREDENTIALS}", passwordVariable: 'QUAY_PASS', usernameVariable: 'QUAY_USER')]) {
                    sh '''
                        echo "Logging into Quay.io..."
                        oc registry login --to=/tmp/auth.json
                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io

                        echo "Tagging and pushing frontend..."
                        FRONTEND_LOCAL=$(oc get is frontend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}')
                        buildah pull --authfile /tmp/auth.json $FRONTEND_LOCAL
                        buildah tag $FRONTEND_LOCAL ${FRONTEND_IMAGE}
                        buildah push --authfile /tmp/auth.json ${FRONTEND_IMAGE}

                        echo "Tagging and pushing backend..."
                        BACKEND_LOCAL=$(oc get is backend -o jsonpath='{.status.tags[0].items[0].dockerImageReference}')
                        buildah pull --authfile /tmp/auth.json $BACKEND_LOCAL
                        buildah tag $BACKEND_LOCAL ${BACKEND_IMAGE}
                        buildah push --authfile /tmp/auth.json ${BACKEND_IMAGE}
                    '''
                }
            }
        }

        stage('Deploy Applications') {
            steps {
                withCredentials([string(credentialsId: 'oc-token-id', variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying applications to OpenShift..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        oc delete all -l app=job-frontend || true
                        oc delete all -l app=job-backend || true

                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend
                        oc expose svc/job-frontend

                        oc new-app ${BACKEND_IMAGE} --name=job-backend
                        oc expose svc/job-backend
                    '''
                }
            }
        }
    }
}

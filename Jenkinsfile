pipeline {
    agent any

    environment {
        PROJECT_NAME = "gamma"
        OPENSHIFT_SERVER = "https://api.ocp4.smartek.ae:6443"

        QUAY_CREDENTIALS_ID = 'ce45edfb-ce9a-42be-aa16-afea0bdc5dfc'
        OC_TOKEN_ID = 'oc-token-id'

        FRONTEND_IMAGE = "quay.io/bilelrifi/job-portal-frontend:p"
        BACKEND_IMAGE = "quay.io/bilelrifi/job-portal-backend:p"
    }

    stages {
        stage('Clone Repo') {
            steps {
                checkout scm
            }
        }

        stage('Login to OpenShift & Quay.io') {
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN'),
                                 usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into OpenShift with token..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}
                        echo "Successfully logged in to project: ${PROJECT_NAME}"
                    '''
                }
            }
        }

        stage('Build and Push Frontend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/podman/stable:latest
                            command: ['/bin/cat']
                            tty: true
                            securityContext:
                              # The runAsUser is removed. OpenShift will assign one automatically.
                              allowPrivilegeEscalation: false
                            resources:
                              requests:
                                memory: "512Mi"
                                cpu: "500m"
                              limits:
                                memory: "1Gi"
                                cpu: "1"
                    '''
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into Quay.io with robot account..."
                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io
                        
                        echo "Building frontend image with Buildah..."
                        buildah bud --storage-driver=vfs -f ./frontend/Dockerfile -t ${FRONTEND_IMAGE} ./frontend
                        
                        echo "Pushing frontend image to Quay.io..."
                        buildah push ${FRONTEND_IMAGE}
                    '''
                }
            }
        }
        
        stage('Build and Push Backend Image') {
            agent {
                kubernetes {
                    defaultContainer 'buildah'
                    yaml '''
                        apiVersion: v1
                        kind: Pod
                        spec:
                          serviceAccountName: jenkins
                          containers:
                          - name: buildah
                            image: quay.io/podman/stable:latest
                            command: ['/bin/cat']
                            tty: true
                            securityContext:
                              # The runAsUser is removed. OpenShift will assign one automatically.
                              allowPrivilegeEscalation: false
                            resources:
                              requests:
                                memory: "512Mi"
                                cpu: "500m"
                              limits:
                                memory: "1Gi"
                                cpu: "1"
                    '''
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: "${QUAY_CREDENTIALS_ID}", usernameVariable: 'QUAY_USER', passwordVariable: 'QUAY_PASS')]) {
                    sh '''
                        echo "Logging into Quay.io with robot account..."
                        buildah login -u $QUAY_USER -p $QUAY_PASS quay.io

                        echo "Building backend image with Buildah..."
                        buildah bud --storage-driver=vfs -f ./backend/Dockerfile -t ${BACKEND_IMAGE} ./backend

                        echo "Pushing backend image to Quay.io..."
                        buildah push ${BACKEND_IMAGE}
                    '''
                }
            }
        }

        stage('Deploy Applications') {
            agent any
            steps {
                withCredentials([string(credentialsId: "${OC_TOKEN_ID}", variable: 'OC_TOKEN')]) {
                    sh '''
                        echo "Deploying applications to OpenShift from Quay.io..."
                        oc login --token=$OC_TOKEN --server=${OPENSHIFT_SERVER} --insecure-skip-tls-verify
                        oc project ${PROJECT_NAME}

                        oc delete all -l app=job-frontend --insecure-skip-tls-verify || true
                        oc delete all -l app=job-backend --insecure-skip-tls-verify || true

                        oc new-app ${FRONTEND_IMAGE} --name=job-frontend --insecure-skip-tls-verify
                        oc expose svc/job-frontend --insecure-skip-tls-verify

                        oc new-app ${BACKEND_IMAGE} --name=job-backend --insecure-skip-tls-verify
                        oc expose svc/job-backend --insecure-skip-tls-verify
                    '''
                }
            }
        }
    }
}